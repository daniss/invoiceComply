#!/usr/bin/env python3
"""
Generate a clean French invoice PDF using ReportLab for testing InvoiceComply
"""

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from datetime import datetime, timedelta

def create_clean_french_invoice():
    # Create PDF document
    filename = "facture_clean_invoicecomply.pdf"
    doc = SimpleDocTemplate(filename, pagesize=A4)
    
    # Get styles
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=20,
        spaceAfter=30,
        alignment=1  # Center
    )
    
    header_style = ParagraphStyle(
        'CustomHeader',
        parent=styles['Heading2'],
        fontSize=14,
        spaceAfter=12,
        textColor=colors.black
    )
    
    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontSize=10,
        spaceAfter=6
    )
    
    # Build content
    story = []
    
    # Title
    story.append(Paragraph("FACTURE", title_style))
    story.append(Spacer(1, 20))
    
    # Company info
    story.append(Paragraph("<b>TECH SOLUTIONS SARL</b>", header_style))
    story.append(Paragraph("123 Avenue des Champs-Élysées", normal_style))
    story.append(Paragraph("75008 Paris, France", normal_style))
    story.append(Paragraph("SIRET: 12345678901234", normal_style))
    story.append(Paragraph("TVA: FR12345678901", normal_style))
    story.append(Paragraph("Tél: 01 42 86 83 26", normal_style))
    story.append(Spacer(1, 20))
    
    # Invoice details
    story.append(Paragraph("<b>FACTURE N° FAC-2024-001234</b>", header_style))
    story.append(Paragraph(f"Date: {datetime.now().strftime('%d/%m/%Y')}", normal_style))
    story.append(Paragraph(f"Date d'échéance: {(datetime.now() + timedelta(days=30)).strftime('%d/%m/%Y')}", normal_style))
    story.append(Spacer(1, 20))
    
    # Client info
    story.append(Paragraph("<b>FACTURÉ À:</b>", header_style))
    story.append(Paragraph("CLIENT ENTREPRISE SAS", normal_style))
    story.append(Paragraph("456 Avenue des Clients", normal_style))
    story.append(Paragraph("69000 Lyon, France", normal_style))
    story.append(Paragraph("SIRET: 98765432109876", normal_style))
    story.append(Spacer(1, 20))
    
    # Services table
    data = [
        ['Description', 'Qté', 'Prix unitaire', 'Total HT'],
        ['Développement site web', '1', '1000.00 EUR', '1000.00 EUR'],
        ['Maintenance mensuelle', '3', '150.00 EUR', '450.00 EUR'],
        ['Formation utilisateurs', '2', '200.00 EUR', '400.00 EUR'],
    ]
    
    table = Table(data, colWidths=[3*inch, 0.8*inch, 1.2*inch, 1.2*inch])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('ALIGN', (1, 1), (-1, -1), 'RIGHT'),
    ]))
    
    story.append(table)
    story.append(Spacer(1, 20))
    
    # Totals table
    totals_data = [
        ['Sous-total HT:', '1850.00 EUR'],
        ['TVA (20%):', '370.00 EUR'],
        ['<b>TOTAL TTC:</b>', '<b>2220.00 EUR</b>'],
    ]
    
    totals_table = Table(totals_data, colWidths=[4*inch, 1.5*inch])
    totals_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, 1), 'Helvetica'),
        ('FONTNAME', (0, 2), (-1, 2), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('GRID', (1, 0), (1, -1), 1, colors.black),
        ('BACKGROUND', (1, 2), (1, 2), colors.lightgrey),
    ]))
    
    story.append(totals_table)
    story.append(Spacer(1, 30))
    
    # Payment terms
    story.append(Paragraph("<b>Conditions de paiement:</b> 30 jours", normal_style))
    story.append(Paragraph("<b>Mode de paiement:</b> Virement bancaire", normal_style))
    story.append(Spacer(1, 20))
    
    # Legal mentions
    legal_style = ParagraphStyle(
        'Legal',
        parent=styles['Normal'],
        fontSize=8,
        spaceAfter=4
    )
    
    story.append(Paragraph("En cas de retard de paiement, seront exigibles une indemnité de 40 EUR pour frais de recouvrement", legal_style))
    story.append(Paragraph("et des intérêts de retard au taux de 10% (art. L441-6 du Code de commerce).", legal_style))
    story.append(Paragraph("Aucun escompte pour paiement anticipé.", legal_style))
    
    # Build PDF
    doc.build(story)
    
    return filename

def main():
    print("Génération d'une facture française propre avec ReportLab...")
    
    filename = create_clean_french_invoice()
    
    import os
    file_size = os.path.getsize(filename)
    
    print(f"Facture générée: {filename}")
    print(f"Taille du fichier: {file_size} bytes")
    
    print("\nContenu de la facture:")
    print("- Émetteur: TECH SOLUTIONS SARL")
    print("- SIRET émetteur: 12345678901234")
    print("- TVA émetteur: FR12345678901")
    print("- Client: CLIENT ENTREPRISE SAS")
    print("- SIRET client: 98765432109876")
    print("- Numéro: FAC-2024-001234")
    print("- Total HT: 1850.00 EUR")
    print("- TVA 20%: 370.00 EUR")
    print("- Total TTC: 2220.00 EUR")
    print("- Conditions: 30 jours")
    print("\nCette facture devrait être parfaitement lisible par pdf-parse!")

if __name__ == "__main__":
    main()