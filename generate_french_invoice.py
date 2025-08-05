#!/usr/bin/env python3
"""
Generate a French invoice PDF for testing InvoiceComply
"""

from fpdf import FPDF
from datetime import datetime, timedelta
import os

class FrenchInvoicePDF(FPDF):
    def header(self):
        self.set_font('Arial', 'B', 16)
        self.cell(0, 10, 'FACTURE', 0, 1, 'C')
        self.ln(10)

    def footer(self):
        self.set_y(-15)
        self.set_font('Arial', 'I', 8)
        self.cell(0, 10, f'Page {self.page_no()}', 0, 0, 'C')

def generate_french_invoice():
    pdf = FrenchInvoicePDF()
    pdf.add_page()
    
    # Company info
    pdf.set_font('Arial', 'B', 12)
    pdf.cell(0, 8, 'TECH SOLUTIONS SARL', 0, 1)
    pdf.set_font('Arial', '', 10)
    pdf.cell(0, 6, '123 Avenue des Champs-Élysées', 0, 1)
    pdf.cell(0, 6, '75008 Paris, France', 0, 1)
    pdf.cell(0, 6, 'SIRET: 12345678901234', 0, 1)
    pdf.cell(0, 6, 'TVA: FR12345678901', 0, 1)
    pdf.cell(0, 6, 'Tél: 01 42 86 83 26', 0, 1)
    pdf.ln(10)
    
    # Invoice details
    pdf.set_font('Arial', 'B', 11)
    pdf.cell(0, 8, 'FACTURE N° FAC-2024-001234', 0, 1)
    pdf.set_font('Arial', '', 10)
    pdf.cell(0, 6, f'Date: {datetime.now().strftime("%d/%m/%Y")}', 0, 1)
    pdf.cell(0, 6, f'Date d\'échéance: {(datetime.now() + timedelta(days=30)).strftime("%d/%m/%Y")}', 0, 1)
    pdf.ln(10)
    
    # Client info
    pdf.set_font('Arial', 'B', 11)
    pdf.cell(0, 8, 'FACTURÉ À:', 0, 1)
    pdf.set_font('Arial', '', 10)
    pdf.cell(0, 6, 'CLIENT ENTREPRISE SAS', 0, 1)
    pdf.cell(0, 6, '456 Avenue des Clients', 0, 1)
    pdf.cell(0, 6, '69000 Lyon, France', 0, 1)
    pdf.cell(0, 6, 'SIRET: 98765432109876', 0, 1)
    pdf.ln(10)
    
    # Services table header
    pdf.set_font('Arial', 'B', 10)
    pdf.cell(80, 8, 'Description', 1, 0, 'C')
    pdf.cell(20, 8, 'Qté', 1, 0, 'C')
    pdf.cell(25, 8, 'Prix unitaire', 1, 0, 'C')
    pdf.cell(25, 8, 'Total HT', 1, 1, 'C')
    
    # Services
    pdf.set_font('Arial', '', 10)
    services = [
        ('Développement site web', 1, 1000.00, 1000.00),
        ('Maintenance mensuelle', 3, 150.00, 450.00),
        ('Formation utilisateurs', 2, 200.00, 400.00)
    ]
    
    total_ht = 0
    for desc, qty, unit_price, total in services:
        pdf.cell(80, 6, desc, 1, 0)
        pdf.cell(20, 6, str(qty), 1, 0, 'C')
        pdf.cell(25, 6, f'{unit_price:.2f} EUR', 1, 0, 'R')
        pdf.cell(25, 6, f'{total:.2f} EUR', 1, 1, 'R')
        total_ht += total
    
    # Totals
    pdf.ln(5)
    pdf.set_font('Arial', 'B', 10)
    pdf.cell(125, 6, 'Sous-total HT:', 0, 0, 'R')
    pdf.cell(25, 6, f'{total_ht:.2f} EUR', 1, 1, 'R')
    
    tva_rate = 0.20
    tva_amount = total_ht * tva_rate
    pdf.cell(125, 6, 'TVA (20%):', 0, 0, 'R')
    pdf.cell(25, 6, f'{tva_amount:.2f} EUR', 1, 1, 'R')
    
    total_ttc = total_ht + tva_amount
    pdf.set_font('Arial', 'B', 12)
    pdf.cell(125, 8, 'TOTAL TTC:', 0, 0, 'R')
    pdf.cell(25, 8, f'{total_ttc:.2f} EUR', 1, 1, 'R')
    
    # Payment terms
    pdf.ln(10)
    pdf.set_font('Arial', '', 10)
    pdf.cell(0, 6, 'Conditions de paiement: 30 jours', 0, 1)
    pdf.cell(0, 6, 'Mode de paiement: Virement bancaire', 0, 1)
    pdf.ln(5)
    
    # Legal mentions
    pdf.set_font('Arial', 'I', 8)
    pdf.cell(0, 4, 'En cas de retard de paiement, seront exigibles une indemnite de 40 EUR pour frais de recouvrement', 0, 1)
    pdf.cell(0, 4, 'et des intérêts de retard au taux de 10% (art. L441-6 du Code de commerce).', 0, 1)
    pdf.cell(0, 4, 'Aucun escompte pour paiement anticipé.', 0, 1)
    
    return pdf

def main():
    print("Génération d'une facture française pour InvoiceComply...")
    
    # Generate PDF
    pdf = generate_french_invoice()
    
    # Save to file
    output_file = 'facture_test_invoicecomply.pdf'
    pdf.output(output_file)
    
    print(f"Facture générée: {output_file}")
    print(f"Taille du fichier: {os.path.getsize(output_file)} bytes")
    
    # Display content summary
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

if __name__ == "__main__":
    main()