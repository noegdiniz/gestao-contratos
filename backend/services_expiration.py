from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
import models

def check_expirations(db: Session):
    """
    Verifica se a data de validade da integração passou e atualiza o status para VENCIDO.
    Deve ser chamado em endpoints estratégicos (ex: listagem de funcionários ou dashboard).
    """
    try:
        # Subquery para pegar o ID do status mais recente de cada funcionário
        subquery = db.query(
            models.StatusFuncionario.funcionarioId,
            func.max(models.StatusFuncionario.id).label('max_id')
        ).group_by(models.StatusFuncionario.funcionarioId).subquery()
        
        # Busca os status atuais que NÃO estão vencidos mas já passaram da data
        # Note: dataValidadeIntegracao pode ser None, então filtramos isso
        expiring = db.query(models.StatusFuncionario).join(
            subquery, models.StatusFuncionario.id == subquery.c.max_id
        ).filter(
            models.StatusFuncionario.statusIntegracao != 'VENCIDO',
            models.StatusFuncionario.dataValidadeIntegracao != None,
            models.StatusFuncionario.dataValidadeIntegracao < datetime.now()
        ).all()
        
        count = 0
        for status in expiring:
            # Cria novo registro de status VENCIDO mantendo os outros dados
            new_status = models.StatusFuncionario(
                statusContratual=status.statusContratual,
                statusIntegracao="VENCIDO",
                funcionarioId=status.funcionarioId,
                funcionarioNome=status.funcionarioNome,
                
                funcaoId=status.funcaoId,
                funcao=status.funcao,
                cargoId=status.cargoId,
                cargo=status.cargo,
                setorId=status.setorId,
                setor=status.setor,
                unidadeIntegracaoId=status.unidadeIntegracaoId,
                unidadeIntegracao=status.unidadeIntegracao,
                unidadeAtividadeId=status.unidadeAtividadeId,
                unidadeAtividade=status.unidadeAtividade,
                
                empresaId=status.empresaId,
                empresaNome=status.empresaNome,
                
                dataIntegracao=status.dataIntegracao,
                dataAso=status.dataAso,
                dataValidadeAso=status.dataValidadeAso,
                dataValidadeIntegracao=status.dataValidadeIntegracao, # Mantém a data antiga que venceu
                prazoAsoDias=status.prazoAsoDias,
                prazoIntegracaoDias=status.prazoIntegracaoDias,
                
                contratoId=status.contratoId,
                contratoNome=status.contratoNome,
                versao=status.versao,
                
                data=datetime.now(),
                tipo="expiracao_automatica"
            )
            db.add(new_status)
            count += 1
            
        if count > 0:
            db.commit()
            print(f"Atualizados {count} funcionários para status VENCIDO.")
            
    except Exception as e:
        print(f"Erro ao verificar expirações: {e}")
        db.rollback()
