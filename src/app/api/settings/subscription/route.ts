import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Get user profile with subscription info
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('subscription_tier, subscription_active, invoice_count_current_month, last_invoice_reset')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Profile error:', profileError)
      return NextResponse.json({ error: 'Erreur de profil utilisateur' }, { status: 500 })
    }

    // Get subscription details from Stripe if available
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single()

    // Calculate limits based on tier
    const limits = {
      starter: 50,
      professional: 500,
      business: -1 // unlimited
    }

    const planNames = {
      starter: 'Starter',
      professional: 'Professional',
      business: 'Business'
    }

    const subscriptionData = {
      plan: userProfile.subscription_tier || 'starter',
      planName: planNames[userProfile.subscription_tier as keyof typeof planNames] || 'Starter',
      status: userProfile.subscription_active ? 'active' : 'trial',
      invoicesUsed: userProfile.invoice_count_current_month || 0,
      invoicesLimit: limits[userProfile.subscription_tier as keyof typeof limits] || 50,
      renewalDate: subscription?.current_period_end || null,
      stripeSubscriptionId: subscription?.stripe_subscription_id || null,
      cancelAtPeriodEnd: subscription?.cancel_at_period_end || false
    }

    return NextResponse.json({
      success: true,
      subscription: subscriptionData
    })

  } catch (error) {
    console.error('Subscription fetch error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de l\'abonnement' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const { action, planId } = body

    if (action === 'change_plan') {
      if (!['starter', 'professional', 'business'].includes(planId)) {
        return NextResponse.json({ error: 'Plan invalide' }, { status: 400 })
      }

      // Update user subscription tier
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          subscription_tier: planId,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (updateError) {
        console.error('Subscription update error:', updateError)
        return NextResponse.json({ error: 'Erreur lors du changement de plan' }, { status: 500 })
      }

      // Log audit trail
      await supabase
        .from('audit_logs')
        .insert({
          user_id: user.id,
          action: 'subscription_plan_changed',
          details: {
            previousPlan: 'unknown', // Would need to fetch from previous state
            newPlan: planId
          }
        })

      return NextResponse.json({
        success: true,
        message: `Plan changé vers ${planId} avec succès`
      })
    }

    return NextResponse.json({ error: 'Action non supportée' }, { status: 400 })

  } catch (error) {
    console.error('Subscription update error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de l\'abonnement' },
      { status: 500 }
    )
  }
}