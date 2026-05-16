from fastapi import APIRouter, Depends, HTTPException
from app.core.security import get_current_user, TokenData, require_permission
from app.core.connectors import connectors

router = APIRouter()

@router.post("/sync/sap", tags=["Integrations"])
@require_permission("integrations.sync")
async def sync_sap(current_user: TokenData = Depends(get_current_user)):
    """Enterprise: Sync inventory data from SAP ERP"""
    return await connectors.sync_sap_inventory()

@router.post("/sync/salesforce", tags=["Integrations"])
@require_permission("integrations.sync")
async def sync_salesforce(current_user: TokenData = Depends(get_current_user)):
    """Enterprise: Sync customer leads from Salesforce CRM"""
    return await connectors.sync_salesforce_leads()

@router.post("/tableau/push", tags=["Integrations"])
@require_permission("integrations.push")
async def push_tableau(data: dict, current_user: TokenData = Depends(get_current_user)):
    """Enterprise: Push processed analytics data to Tableau BI"""
    return await connectors.push_tableau_analytics(data)
