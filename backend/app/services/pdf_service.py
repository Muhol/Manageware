from fpdf import FPDF
import os
from typing import List
from .. import models

def generate_po_pdf(po: models.PurchaseOrder, items: List[models.PurchaseOrderItem], property_name: str):
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Arial", 'B', 16)
    pdf.cell(40, 10, f"Purchase Order: {po.po_number}")
    pdf.ln(10)
    pdf.set_font("Arial", '', 12)
    pdf.cell(40, 10, f"Property: {property_name}")
    pdf.ln(10)
    pdf.cell(40, 10, f"Date: {po.created_at.strftime('%Y-%m-%d')}")
    pdf.ln(20)
    
    # Table Header
    pdf.set_font("Arial", 'B', 10)
    pdf.cell(80, 10, "Item / Asset Type", 1)
    pdf.cell(30, 10, "Quantity", 1)
    pdf.cell(40, 10, "Unit Price", 1)
    pdf.cell(40, 10, "Total", 1)
    pdf.ln(10)
    
    # Table Body
    pdf.set_font("Arial", '', 10)
    for item in items:
        asset_name = item.asset_type.name if item.asset_type else "Hardware Item"
        pdf.cell(80, 10, asset_name, 1)
        pdf.cell(30, 10, str(item.quantity), 1)
        pdf.cell(40, 10, f"Ksh {item.unit_price:,.2f}", 1)
        pdf.cell(40, 10, f"Ksh {item.total_price:,.2f}", 1)
        pdf.ln(10)
        
    pdf.ln(10)
    pdf.set_font("Arial", 'B', 12)
    pdf.cell(40, 10, f"Total Amount: Ksh {po.total_amount:,.2f}")
    
    # Ensure directory exists
    os.makedirs("static/pdfs", exist_ok=True)
    file_path = f"static/pdfs/{po.po_number}.pdf"
    pdf.output(file_path)
    return file_path
