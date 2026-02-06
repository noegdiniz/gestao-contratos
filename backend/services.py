import os
import base64
import io
from sqlalchemy.orm import Session
import models
from fpdf import FPDF
from datetime import datetime

class GoogleDriveService:
    def __init__(self, db: Session):
        self.db = db

    async def upload_approved_document(self, documento_id: int, file_content: bytes, filename: str):
        # Placeholder for Google Drive API logic
        # 1. Get credentials from DB or Env
        # 2. Authenticate
        # 3. Upload to folder defined in 'Cubos'
        print(f"Uploading {filename} to Google Drive for Doc ID {documento_id}")
        return {"success": True, "file_id": "google-drive-id-placeholder"}

class PDFReport(FPDF):
    def header(self):
        pass

class ReportingService:
    def __init__(self, db: Session):
        self.db = db

    def generate_custom_cube_excel(self, columns: list, date_filter: dict = None, column_filters: dict = None):
        import pandas as pd
        from sqlalchemy import text
        import io
        
        # Field mapping: Human Readable -> SQL Column
        # Tables: sf (statusFuncionarios), e (empresas), c (contratos), d (documentos)
        field_map = {
            # --- Funcionário / Integração ---
            "Funcionário": "sf.funcionarioNome",
            "Status Integração": "sf.statusIntegracao",
            "Data Integração": "sf.dataIntegracao",
            "Unidade Integração": "sf.unidadeIntegracao",
            "Unidade Atividade": "sf.unidadeAtividade",
            "Função": "sf.funcao",
            "Cargo": "sf.cargo",
            "Setor": "sf.setor",
            "Status Contratual": "sf.statusContratual",
            "Data ASO": "sf.dataAso",
            "Validade ASO": "sf.dataValidadeAso",
            "Validade Integração": "sf.dataValidadeIntegracao",
            "Dias Restantes ASO": "sf.prazoAsoDias",
            "Dias Restantes Integração": "sf.prazoIntegracaoDias",
            
            # --- Empresa ---
            "Empresa": "COALESCE(sf.empresaNome, e.nome)",
            "CNPJ Empresa": "e.cnpj",
            "Departamento": "e.departamento",
            "Status Empresa": "e.status",
            
            # --- Contrato ---
            "Contrato": "COALESCE(sf.contratoNome, c.nome)",
            "Início Contrato": "c.dtInicio",
            "Fim Contrato": "c.dtFim",
            "Status Contrato": "c.status",
            "Categoria Contrato": "c.categoriaNome",
            
            # --- Documentação ---
            "Título do Documento": "d.titulo",
            "Categoria do Documento": "d.categoriaNome",
            "Competência": "d.competencia",
            "Status do Documento": "d.status",
            "Email Responsável": "d.email",
            "Data Documento": "d.data",
            "Data Criação Doc": "d.createdAt"
        }

        # Build Select Clause
        select_parts = []
        df_columns = []
        for col_name in columns:
            if col_name in field_map:
                select_parts.append(f'{field_map[col_name]} as "{col_name}"')
                df_columns.append(col_name)

        if not select_parts:
            # Default fallback columns if somehow empty
            select_parts = ['sf.funcionarioNome as "Funcionário"', 'sf.empresaNome as "Empresa"']
            df_columns = ["Funcionário", "Empresa"]

        # Base query with joins
        # Using LEFT JOIN to ensure we don't lose records
        # Joining documents with employees or contracts if available
        sql = f"""
            SELECT {", ".join(select_parts)}
            FROM statusFuncionarios sf
            LEFT JOIN empresas e ON sf.empresaId = e.id
            LEFT JOIN contratos c ON sf.contratoId = c.id
            LEFT JOIN documentos d ON (sf.funcionarioId = d.funcionarioId OR (d.funcionarioId IS NULL AND sf.contratoId = d.contratoId))
        """

        # Filter Logic
        params = {}
        where_clauses = []
        
        if date_filter and "field" in date_filter and date_filter["field"] in field_map:
            filter_col = field_map[date_filter["field"]]
            if date_filter.get("start") and date_filter.get("end"):
                where_clauses.append(f"{filter_col} BETWEEN :start AND :end")
                params["start"] = date_filter["start"]
                params["end"] = date_filter["end"] + " 23:59:59"
            elif date_filter.get("start"):
                where_clauses.append(f"{filter_col} >= :start")
                params["start"] = date_filter["start"]
            elif date_filter.get("end"):
                where_clauses.append(f"{filter_col} <= :end")
                params["end"] = date_filter["end"] + " 23:59:59"

        # 2. Per-Column Filters
        if column_filters:
            for i, (col_name, filter_info) in enumerate(column_filters.items()):
                if col_name in field_map:
                    sql_col = field_map[col_name]
                    operator = filter_info.get("operator", "igual")
                    value = filter_info.get("value")
                    
                    if value is not None and value != "":
                        param_name = f"col_filter_{i}"
                        if operator == "igual":
                            where_clauses.append(f"{sql_col} = :{param_name}")
                            params[param_name] = value
                        elif operator == "contem":
                            where_clauses.append(f"{sql_col} LIKE :{param_name}")
                            params[param_name] = f"%{value}%"
                        elif operator == "in":
                            # Process comma-separated values
                            val_list = [v.strip() for v in str(value).split(",")]
                            # SQL IN clause with dynamic parameters
                            in_params = []
                            for j, val in enumerate(val_list):
                                p_name = f"{param_name}_{j}"
                                in_params.append(f":{p_name}")
                                params[p_name] = val
                            where_clauses.append(f"{sql_col} IN ({', '.join(in_params)})")

        if where_clauses:
            sql += " WHERE " + " AND ".join(where_clauses)
            
        sql += " ORDER BY sf.id DESC"

        result = self.db.execute(text(sql), params)
        df = pd.DataFrame(result.fetchall(), columns=df_columns)
        
        # Identity and format date columns automatically
        date_keywords = ["Data", "Validade", "Início", "Fim", "Criação"]
        for col in df.columns:
            if any(key in col for key in date_keywords):
                try:
                    df[col] = pd.to_datetime(df[col]).dt.date
                except:
                    pass
                
        # Export to bytes
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Cubo Customizado')
            
            # Formatting
            worksheet = writer.sheets['Cubo Customizado']
            for col in worksheet.columns:
                max_length = 0
                column = col[0].column_letter
                for cell in col:
                    try:
                        if len(str(cell.value)) > max_length:
                            max_length = len(str(cell.value))
                    except:
                        pass
                worksheet.column_dimensions[column].width = min(max_length + 4, 70)
                
        return output.getvalue()

    def generate_scheduled_integration_pdf(self, results, config, date_start: str, date_end: str, unidade_nome: str):
        pdf = FPDF()
        pdf.add_page()
        
        # Logo handling (Save to temp file to avoid FPDF BytesIO issues)
        if config.logoImage:
            try:
                header_logo = config.logoImage
                if "," in header_logo:
                    header_logo = header_logo.split(",")[1]
                
                import tempfile
                with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as temp_logo:
                    temp_logo.write(base64.b64decode(header_logo))
                    temp_logo_path = temp_logo.name
                
                pdf.image(temp_logo_path, x=10, y=8, h=15)
                os.unlink(temp_logo_path)
            except Exception as e:
                print(f"Error loading logo in PDF: {e}")

        pdf.set_y(25) # Adjust based on logo presence/size
        pdf.set_font('helvetica', 'B', 16)
        pdf.cell(0, 8, 'Integrações Agendadas por Período', ln=True, align='C')
        pdf.set_font('helvetica', '', 11)
        pdf.cell(0, 6, 'Ficha de Presença', ln=True, align='C')
        pdf.ln(5)

        # Helper for date formatting
        def format_date_br(date_str):
            try:
                if not date_str: return "-"
                if isinstance(date_str, datetime):
                    return date_str.strftime("%d/%m/%Y")
                # Assume YYYY-MM-DD
                dt = datetime.strptime(date_str, "%Y-%m-%d")
                return dt.strftime("%d/%m/%Y")
            except:
                return date_str

        date_start_br = format_date_br(date_start)
        date_end_br = format_date_br(date_end)

        # Info Header
        pdf.set_font('helvetica', 'B', 10)
        pdf.cell(0, 5, f"Empresa: {config.nomeEmpresa}", ln=True)
        pdf.cell(0, 5, f"Unidade de Integração: {unidade_nome or 'Todas'}", ln=True)
        pdf.cell(0, 5, f"Período: {date_start_br} até {date_end_br}", ln=True)
        pdf.ln(8)

        # Group results by Provider
        grouped = {}
        for row in results:
            emp = row.empresa_nome
            if emp not in grouped:
                grouped[emp] = []
            grouped[emp].append(row)

        for emp_nome, emps in grouped.items():
            # Provider Header
            pdf.set_font('helvetica', 'B', 11)
            pdf.set_fill_color(245, 245, 245)
            pdf.cell(0, 8, f"Prestadora: {emp_nome}", ln=True, fill=True, border='LTBR')
            
            # Table Header
            pdf.set_font('helvetica', 'B', 9)
            pdf.cell(80, 7, 'Nome do Funcionário', border=1, align='C')
            pdf.cell(40, 7, 'Cargo', border=1, align='C')
            pdf.cell(35, 7, 'Setor', border=1, align='C')
            pdf.cell(35, 7, 'Data Agendada', border=1, ln=True, align='C')

            # Table Rows
            pdf.set_font('helvetica', '', 8)
            for e in emps:
                data_str = e.data_integracao.strftime("%d/%m/%Y %H:%M") if e.data_integracao else "-"
                
                # Check for page break before drawing row
                if pdf.get_y() > 260:
                    pdf.add_page()
                    pdf.set_font('helvetica', 'B', 9)
                    pdf.cell(80, 7, 'Nome do Funcionário', border=1, align='C')
                    pdf.cell(40, 7, 'Cargo', border=1, align='C')
                    pdf.cell(35, 7, 'Setor', border=1, align='C')
                    pdf.cell(35, 7, 'Data Agendada', border=1, ln=True, align='C')
                    pdf.set_font('helvetica', '', 8)

                pdf.cell(80, 6, e.funcionario_nome[:45], border=1)
                pdf.cell(40, 6, (e.cargo_nome or "-")[:25], border=1)
                pdf.cell(35, 6, (e.setor_nome or "-")[:20], border=1)
                pdf.cell(35, 6, data_str, border=1, ln=True, align='C')
            pdf.ln(6)

        # Signatures section
        pdf.ln(5)
        signature_areas = [
            "RSC",
            "Ambiência e Certificação",
            "TI",
            "Saúde e Segurança do Trabalho",
            "Recursos Humanos"
        ]

        for area in signature_areas:
            if pdf.get_y() > 240:
                pdf.add_page()
            pdf.ln(12)
            y_pos = pdf.get_y()
            pdf.line(10, y_pos, 110, y_pos)
            pdf.set_font('helvetica', 'I', 8)
            pdf.cell(0, 5, area, ln=True)

        return pdf.output(dest='S').encode('latin-1')

    def generate_employee_history_pdf(self, funcionario_id: int):
        # 1. Fetch Data
        funcionario = self.db.query(models.Funcionario).filter(models.Funcionario.id == funcionario_id).first()
        if not funcionario:
            return None
            
        status = self.db.query(models.StatusFuncionario).filter(models.StatusFuncionario.funcionarioId == funcionario_id).order_by(models.StatusFuncionario.id.desc()).first()
        empresa = self.db.query(models.Empresa).filter(models.Empresa.id == funcionario.empresaId).first()
        contrato = self.db.query(models.Contrato).filter(models.Contrato.id == funcionario.contratoId).first()
        
        anexos = self.db.query(models.AnexoFuncionario).filter(models.AnexoFuncionario.funcionarioId == funcionario_id).all()
        
        # 2. PDF Setup
        pdf = FPDF()
        pdf.add_page()
        
        # Logo handling
        config = self.db.query(models.Configuracao).first()
        if config and config.logoImage:
            try:
                header_logo = config.logoImage
                if "," in header_logo:
                    header_logo = header_logo.split(",")[1]
                
                import tempfile
                with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as temp_logo:
                    temp_logo.write(base64.b64decode(header_logo))
                    temp_logo_path = temp_logo.name
                
                pdf.image(temp_logo_path, x=10, y=8, h=15)
                os.unlink(temp_logo_path)
            except Exception as e:
                print(f"Error loading logo: {e}")

        pdf.set_y(25)
        pdf.set_font('helvetica', 'B', 16)
        pdf.cell(0, 8, 'Histórico de Documentação de Integração', ln=True, align='C')
        pdf.ln(5)

        # 3. Header Info
        pdf.set_font('helvetica', 'B', 12)
        pdf.set_fill_color(240, 240, 240)
        pdf.cell(0, 8, 'Dados do Colaborador', ln=True, fill=True)
        
        pdf.set_font('helvetica', '', 10)
        pdf.ln(2)
        
        def draw_info_row(label1, value1, label2=None, value2=None):
            y = pdf.get_y()
            pdf.set_font('helvetica', 'B', 10)
            pdf.cell(35, 6, label1, border=0)
            pdf.set_font('helvetica', '', 10)
            pdf.cell(60, 6, value1, border=0)
            
            if label2:
                pdf.set_font('helvetica', 'B', 10)
                pdf.cell(35, 6, label2, border=0)
                pdf.set_font('helvetica', '', 10)
                pdf.cell(60, 6, value2, border=0)
            pdf.ln(6)

        draw_info_row("Nome:", funcionario.nome[:40], "Status:", status.statusIntegracao if status else "PENDENTE")
        draw_info_row("Empresa:", empresa.nome[:30] if empresa else "-", "Contrato:", contrato.nome[:30] if contrato else "-")
        
        if status:
            draw_info_row("Função:", status.funcao or "-", "Cargo:", status.cargo or "-")
            draw_info_row("Data ASO:", status.dataAso.strftime("%d/%m/%Y") if status.dataAso else "-", "Validade ASO:", status.dataValidadeAso.strftime("%d/%m/%Y") if status.dataValidadeAso else "-")
            draw_info_row("Integração:", status.dataIntegracao.strftime("%d/%m/%Y") if status.dataIntegracao else "-", "Validade Int.:", status.dataValidadeIntegracao.strftime("%d/%m/%Y") if status.dataValidadeIntegracao else "-")
        
        pdf.ln(8)

        # 4. Documentation History
        pdf.set_font('helvetica', 'B', 12)
        pdf.cell(0, 8, 'Histórico de Validação de Documentos', ln=True, fill=True)
        pdf.ln(2)
        
        if not anexos:
            pdf.set_font('helvetica', 'I', 10)
            pdf.cell(0, 10, "Nenhum documento enviado até o momento.", ln=True, align='C')
        else:
            for anexo in anexos:
                # Check page break
                if pdf.get_y() > 250:
                    pdf.add_page()
                
                # Document Header
                pdf.set_font('helvetica', 'B', 11)
                pdf.cell(0, 8, f"Documento: {anexo.tipo}", ln=True, border='B')
                
                # Current Status
                pdf.set_font('helvetica', '', 9)
                status_label = anexo.status
                pdf.cell(30, 6, "Status Atual:", border=0)
                pdf.set_font('helvetica', 'B', 9)
                pdf.cell(50, 6, status_label, border=0)
                pdf.set_font('helvetica', '', 9)
                pdf.cell(30, 6, "Enviado em:", border=0)
                pdf.cell(50, 6, anexo.uploadDate.strftime("%d/%m/%Y %H:%M"), border=0, ln=True)
                
                # Fetch history for this document
                history = self.db.query(models.Aprovacao).filter(models.Aprovacao.anexoFuncionarioId == anexo.id).order_by(models.Aprovacao.id.asc()).all()
                
                if history:
                    pdf.ln(2)
                    pdf.set_font('helvetica', 'B', 8)
                    pdf.cell(40, 5, "Data/Hora", border=1, fill=True)
                    pdf.cell(40, 5, "Responsável", border=1, fill=True)
                    pdf.cell(30, 5, "Ação", border=1, fill=True)
                    pdf.cell(80, 5, "Observação", border=1, ln=True, fill=True)
                    
                    pdf.set_font('helvetica', '', 8)
                    for h in history:
                        # Check page break inside table
                        if pdf.get_y() > 260:
                            pdf.add_page()
                            # Re-print headers
                            pdf.set_font('helvetica', 'B', 8)
                            pdf.cell(40, 5, "Data/Hora", border=1, fill=True)
                            pdf.cell(40, 5, "Responsável", border=1, fill=True)
                            pdf.cell(30, 5, "Ação", border=1, fill=True)
                            pdf.cell(80, 5, "Observação", border=1, ln=True, fill=True)
                            pdf.set_font('helvetica', '', 8)

                        # Parse timestamp string from Aprovacao.data (it's string format in model)
                        # Assuming format stored in 'Aprovacao.data' is 'YYYY-MM-DD HH:MM:SS' or compatible
                        try:
                            dt_str = datetime.strptime(h.data, "%Y-%m-%d %H:%M:%S").strftime("%d/%m/%Y %H:%M")
                        except:
                            dt_str = h.data

                        pdf.cell(40, 5, dt_str, border=1)
                        pdf.cell(40, 5, h.perfilNome[:20], border=1)
                        pdf.cell(30, 5, h.status, border=1)
                        pdf.cell(80, 5, (h.obs or "-")[:60], border=1, ln=True)
                else:
                    pdf.ln(1)
                    pdf.set_font('helvetica', 'I', 8)
                    pdf.cell(0, 5, "Sem histórico de aprovações registrado.", ln=True)
                
                pdf.ln(4)

        # Footer
        pdf.set_y(-15)
        pdf.set_font('helvetica', 'I', 8)
        pdf.cell(0, 10, f'Relatório gerado em {datetime.now().strftime("%d/%m/%Y %H:%M")}', 0, 0, 'C')

        return pdf.output(dest='S').encode('latin-1')
