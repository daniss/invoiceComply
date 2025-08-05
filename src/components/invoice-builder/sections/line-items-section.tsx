'use client'

import { useState } from 'react'
import { UseFormReturn, useFieldArray } from 'react-hook-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  ShoppingCart, 
  Plus, 
  Trash2, 
  Calculator,
  Hash,
  Euro,
  Package,
  TrendingUp,
  AlertCircle,
  Info
} from 'lucide-react'
import { InvoiceFormData } from '../invoice-builder-form'

interface LineItemsSectionProps {
  form: UseFormReturn<InvoiceFormData>
}

// French VAT rates
const VAT_RATES = [
  { value: 0, label: '0% (Exonéré)' },
  { value: 2.1, label: '2,1% (Médicaments)' },
  { value: 5.5, label: '5,5% (Livres, alimentation)' },
  { value: 10, label: '10% (Restauration, transport)' },
  { value: 20, label: '20% (Taux normal)' }
]

export function LineItemsSection({ form }: LineItemsSectionProps) {
  const { 
    register, 
    control, 
    watch, 
    setValue,
    formState: { errors }
  } = form

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'lineItems'
  })

  const watchedItems = watch('lineItems')

  // Calculate totals
  const calculateItemTotal = (quantity: number, unitPrice: number, vatRate: number) => {
    const htAmount = quantity * unitPrice
    const vatAmount = htAmount * (vatRate / 100)
    const ttcAmount = htAmount + vatAmount
    return { htAmount, vatAmount, ttcAmount }
  }

  const calculateInvoiceTotals = () => {
    let totalHT = 0
    let totalVAT = 0
    const vatBreakdown: { [key: number]: { base: number, amount: number } } = {}

    watchedItems.forEach((item) => {
      const { htAmount, vatAmount } = calculateItemTotal(
        item.quantity || 0, 
        item.unitPrice || 0, 
        item.vatRate || 20
      )
      
      totalHT += htAmount
      totalVAT += vatAmount

      // Group by VAT rate for breakdown
      if (!vatBreakdown[item.vatRate || 20]) {
        vatBreakdown[item.vatRate || 20] = { base: 0, amount: 0 }
      }
      vatBreakdown[item.vatRate || 20].base += htAmount
      vatBreakdown[item.vatRate || 20].amount += vatAmount
    })

    return {
      totalHT,
      totalVAT,
      totalTTC: totalHT + totalVAT,
      vatBreakdown
    }
  }

  const totals = calculateInvoiceTotals()

  const addLineItem = () => {
    append({
      id: Date.now().toString(),
      description: '',
      quantity: 1,
      unitPrice: 0,
      vatRate: 20
    })
  }

  const removeLineItem = (index: number) => {
    if (fields.length > 1) {
      remove(index)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-2xl font-bold text-slate-900 flex items-center">
          <ShoppingCart className="h-6 w-6 mr-2 text-purple-600" />
          Prestations et services
        </h3>
        <p className="text-slate-600 mt-1">
          Détail des lignes de facturation avec calculs automatiques
        </p>
      </div>

      {/* Line Items */}
      <div className="space-y-4">
        {fields.map((field, index) => {
          const item = watchedItems[index] || {}
          const { htAmount, vatAmount, ttcAmount } = calculateItemTotal(
            item.quantity || 0,
            item.unitPrice || 0,
            item.vatRate || 20
          )

          return (
            <Card key={field.id} className="relative">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center text-lg">
                    <Package className="h-5 w-5 mr-2 text-purple-600" />
                    Ligne {index + 1}
                  </CardTitle>
                  
                  <div className="flex items-center space-x-2">
                    <Badge className="bg-purple-100 text-purple-700">
                      Total: {ttcAmount.toFixed(2)}€ TTC
                    </Badge>
                    
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        onClick={() => removeLineItem(index)}
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Description */}
                  <div className="md:col-span-2">
                    <Label htmlFor={`lineItem-${index}-description`} className="flex items-center">
                      <Package className="h-4 w-4 mr-1" />
                      Description *
                    </Label>
                    <Input
                      id={`lineItem-${index}-description`}
                      {...register(`lineItems.${index}.description`)}
                      placeholder="Prestation de conseil, développement, formation..."
                      className={errors.lineItems?.[index]?.description ? 'border-red-300' : ''}
                    />
                    {errors.lineItems?.[index]?.description && (
                      <p className="text-sm text-red-600 mt-1">
                        {errors.lineItems[index]?.description?.message}
                      </p>
                    )}
                  </div>

                  {/* Quantity */}
                  <div>
                    <Label htmlFor={`lineItem-${index}-quantity`} className="flex items-center">
                      <Hash className="h-4 w-4 mr-1" />
                      Quantité *
                    </Label>
                    <Input
                      id={`lineItem-${index}-quantity`}
                      type="number"
                      step="0.01"
                      min="0.01"
                      {...register(`lineItems.${index}.quantity`, { valueAsNumber: true })}
                      placeholder="1"
                      className={errors.lineItems?.[index]?.quantity ? 'border-red-300' : ''}
                    />
                    {errors.lineItems?.[index]?.quantity && (
                      <p className="text-sm text-red-600 mt-1">
                        {errors.lineItems[index]?.quantity?.message}
                      </p>
                    )}
                  </div>

                  {/* Unit Price */}
                  <div>
                    <Label htmlFor={`lineItem-${index}-unitPrice`} className="flex items-center">
                      <Euro className="h-4 w-4 mr-1" />
                      Prix unitaire HT *
                    </Label>
                    <Input
                      id={`lineItem-${index}-unitPrice`}
                      type="number"
                      step="0.01"
                      min="0"
                      {...register(`lineItems.${index}.unitPrice`, { valueAsNumber: true })}
                      placeholder="0.00"
                      className={errors.lineItems?.[index]?.unitPrice ? 'border-red-300' : ''}
                    />
                    {errors.lineItems?.[index]?.unitPrice && (
                      <p className="text-sm text-red-600 mt-1">
                        {errors.lineItems[index]?.unitPrice?.message}
                      </p>
                    )}
                  </div>

                  {/* VAT Rate */}
                  <div>
                    <Label htmlFor={`lineItem-${index}-vatRate`} className="flex items-center">
                      <TrendingUp className="h-4 w-4 mr-1" />
                      Taux de TVA
                    </Label>
                    <Select
                      value={item.vatRate?.toString() || '20'}
                      onValueChange={(value) => 
                        setValue(`lineItems.${index}.vatRate`, parseFloat(value))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un taux" />
                      </SelectTrigger>
                      <SelectContent>
                        {VAT_RATES.map((rate) => (
                          <SelectItem key={rate.value} value={rate.value.toString()}>
                            {rate.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Calculations Display */}
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-slate-900 mb-2 flex items-center">
                      <Calculator className="h-4 w-4 mr-1" />
                      Calculs automatiques
                    </h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Montant HT:</span>
                        <span className="font-medium">{htAmount.toFixed(2)}€</span>
                      </div>
                      <div className="flex justify-between">
                        <span>TVA ({item.vatRate || 20}%):</span>
                        <span className="font-medium">{vatAmount.toFixed(2)}€</span>
                      </div>
                      <div className="flex justify-between border-t pt-1 font-semibold">
                        <span>Total TTC:</span>
                        <span>{ttcAmount.toFixed(2)}€</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Add Line Item Button */}
      <div className="flex justify-center">
        <Button
          type="button"
          onClick={addLineItem}
          variant="outline"
          className="border-dashed border-2 border-purple-300 text-purple-600 hover:bg-purple-50"
        >
          <Plus className="h-4 w-4 mr-2" />
          Ajouter une ligne
        </Button>
      </div>

      {/* Invoice Totals */}
      <Card className="bg-gradient-to-br from-slate-50 to-slate-100">
        <CardHeader>
          <CardTitle className="flex items-center text-xl">
            <Calculator className="h-6 w-6 mr-2 text-green-600" />
            Récapitulatif de la facture
          </CardTitle>
          <CardDescription>
            Calculs automatiques avec détail de la TVA
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Main Totals */}
            <div className="space-y-3">
              <div className="flex justify-between text-lg">
                <span>Total HT:</span>
                <span className="font-semibold">{totals.totalHT.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between text-lg">
                <span>Total TVA:</span>
                <span className="font-semibold">{totals.totalVAT.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between text-xl font-bold border-t pt-3">
                <span>Total TTC:</span>
                <span className="text-green-600">{totals.totalTTC.toFixed(2)}€</span>
              </div>
            </div>

            {/* VAT Breakdown */}
            <div>
              <h4 className="font-semibold mb-3">Détail TVA par taux:</h4>
              <div className="space-y-2">
                {Object.entries(totals.vatBreakdown).map(([rate, data]) => (
                  <div key={rate} className="bg-white p-3 rounded-lg">
                    <div className="flex justify-between text-sm">
                      <span>TVA {rate}%:</span>
                      <span>{data.amount.toFixed(2)}€</span>
                    </div>
                    <div className="text-xs text-slate-600">
                      Base: {data.base.toFixed(2)}€
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Information Alerts */}
      <div className="space-y-4">
        <Alert className="border-green-200 bg-green-50">
          <Calculator className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-900">
            <strong>Calculs automatiques:</strong> Tous les montants HT, TVA et TTC sont calculés automatiquement 
            en temps réel à chaque modification.
          </AlertDescription>
        </Alert>

        <Alert className="border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900">
            <strong>Taux de TVA:</strong> Les taux de TVA proposés correspondent aux taux officiels français. 
            Le taux normal est de 20%.
          </AlertDescription>
        </Alert>

        <Alert className="border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-900">
            <strong>Validation:</strong> Au moins une ligne de facturation est requise. Les quantités doivent être 
            positives et les prix ne peuvent pas être négatifs.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  )
}