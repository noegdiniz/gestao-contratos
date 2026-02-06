
# Genérico para CRUD de catálogos simples (id, nome)
def create_catalog_endpoints(app, model, path, permission_prefix):
    @app.get(f"/{path}")
    def list_items(db: Session = Depends(get_db)):
        return db.query(model).filter(model.active == True).all()

    @app.post(f"/{path}")
    def create_item(item: dict, db: Session = Depends(get_db), current_user: dict = Depends(check_permission(f"canCreate{permission_prefix}"))):
        db_item = model(**item)
        db.add(db_item)
        db.commit()
        db.refresh(db_item)
        return db_item

    @app.delete(f"/{path}/{{item_id}}")
    def delete_item(item_id: int, db: Session = Depends(get_db), current_user: dict = Depends(check_permission(f"canDelete{permission_prefix}"))):
        db_item = db.query(model).filter(model.id == item_id).first()
        if not db_item:
            raise HTTPException(status_code=404, detail="Item not found")
        db_item.active = False # Soft delete
        db.commit()
        return {"message": "Item deleted"}

# Criar endpoints para os novos catálogos
create_catalog_endpoints(app, models.Funcao, "funcoes", "Funcoes")
create_catalog_endpoints(app, models.Cargo, "cargos", "Cargos")
create_catalog_endpoints(app, models.Setor, "setores", "Setores")
create_catalog_endpoints(app, models.UnidadeIntegracao, "unidades-integracao", "UnidadesIntegracao")
