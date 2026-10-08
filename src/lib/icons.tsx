import { Car, DollarSign, Fuel, Gamepad2, HeartPulse, House, Landmark, Monitor, PawPrint, PiggyBank, Pizza, Plane, Plus, Repeat2, Route, ShoppingBag, ShieldCheck, Ticket, Utensils, Wifi, Zap } from 'lucide-react'
import type { ComponentType } from 'react'
import type { TranslationKey } from './i18n'

type IconComponent = ComponentType<{ size?: number }>

function RentIcon({ size = 24 }: { size?: number }) {
  return <span className="gasel-icon-composite" style={{ width: size, height: size }}><House size={size}/><DollarSign className="gasel-icon-composite__badge" size={Math.max(9, size * .48)}/></span>
}

function TollIcon({ size = 24 }: { size?: number }) {
  return <span className="gasel-icon-composite" style={{ width: size, height: size }}><Route size={size}/><DollarSign className="gasel-icon-composite__badge" size={Math.max(9, size * .48)}/></span>
}

export const ICON_OPTIONS = [
  { id: 'travel', icon: Plane, label: 'goalTravel' }, { id: 'car', icon: Car, label: 'iconCar' },
  { id: 'subscription', icon: Repeat2, label: 'iconSubscription' }, { id: 'tech', icon: Monitor, label: 'goalTech' },
  { id: 'pets', icon: PawPrint, label: 'iconPets' }, { id: 'house', icon: House, label: 'housing' },
  { id: 'internet', icon: Wifi, label: 'iconInternet' }, { id: 'credit', icon: Landmark, label: 'credit' },
  { id: 'games', icon: Gamepad2, label: 'iconGames' }, { id: 'food', icon: Utensils, label: 'food' },
  { id: 'fastFood', icon: Pizza, label: 'dining' }, { id: 'rent', icon: RentIcon, label: 'rent' },
  { id: 'electricity', icon: Zap, label: 'electricity' }, { id: 'insurance', icon: ShieldCheck, label: 'insurance' },
  { id: 'health', icon: HeartPulse, label: 'iconHealth' }, { id: 'leisure', icon: Ticket, label: 'leisure' },
  { id: 'shopping', icon: ShoppingBag, label: 'iconShopping' }, { id: 'toll', icon: TollIcon, label: 'iconToll' },
  { id: 'fuel', icon: Fuel, label: 'fuel' }, { id: 'safety', icon: PiggyBank, label: 'goalSafety' },
  { id: 'income', icon: DollarSign, label: 'income' }, { id: 'other', icon: Plus, label: 'other' },
] as const satisfies ReadonlyArray<{ id: string; icon: IconComponent; label: TranslationKey }>

export type IconId = typeof ICON_OPTIONS[number]['id']

export const iconById = Object.fromEntries(ICON_OPTIONS.map((option) => [option.id, option.icon])) as Record<IconId, IconComponent>
