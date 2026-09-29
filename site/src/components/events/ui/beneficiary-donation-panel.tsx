import { DollarSign, HeartHandshake, Package } from 'lucide-react'
import { GOODS_TYPE_OPTIONS } from '../../../constants/event'
import { ToggleSwitch } from './toggle-switch'

interface BeneficiaryDonationPanelProps {
  funds: boolean
  goods: boolean
  goodsTypes: string[]
  goodsError?: string
  onFundsChange: (value: boolean) => void
  onGoodsChange: (value: boolean) => void
  onToggleGoodsType: (id: string) => void
}

export function BeneficiaryDonationPanel({
  funds,
  goods,
  goodsTypes,
  goodsError,
  onFundsChange,
  onGoodsChange,
  onToggleGoodsType,
}: BeneficiaryDonationPanelProps) {
  return (
    <aside className="flex max-h-[90vh] w-full flex-col rounded-xl bg-white p-6 shadow-lg sm:w-80">
      <div className="mb-4 flex items-center gap-2 border-b pb-4">
        <span className="rounded-lg bg-green-50 p-2 text-green-700">
          <HeartHandshake size={18} />
        </span>
        <div>
          <h3 className="text-base font-semibold text-gray-900">Accepted Donations</h3>
          <p className="text-xs text-gray-500">What this event can receive for beneficiaries</p>
        </div>
      </div>

      <div className="scrollbar-hide flex-1 space-y-3 overflow-y-auto px-1 py-1">
        <ToggleSwitch
          checked={funds}
          onChange={onFundsChange}
          label="Monetary Donations"
          description="Accept cash, bank transfers, and online payments"
          icon={<DollarSign className="h-5 w-5" />}
        />

        <ToggleSwitch
          checked={goods}
          onChange={onGoodsChange}
          label="Goods & Supplies"
          description="Accept physical items and materials"
          icon={<Package className="h-5 w-5" />}
        />

        {goods && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="mb-2 text-sm font-medium text-gray-700">Goods types needed</p>
            <div className="grid grid-cols-2 gap-2">
              {GOODS_TYPE_OPTIONS.map((gt) => {
                const Icon = gt.icon
                const selected = goodsTypes.includes(gt.id)
                return (
                  <label
                    key={gt.id}
                    className={`flex cursor-pointer items-center gap-2 rounded-md border-2 p-2 text-xs ${
                      selected ? `${gt.borderColor} ${gt.bgColor}` : 'border-gray-200 bg-white'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => onToggleGoodsType(gt.id)}
                      className="rounded"
                    />
                    <Icon className={`h-4 w-4 ${gt.color}`} />
                    <span>{gt.name}</span>
                  </label>
                )
              })}
            </div>
            {goodsError && <p className="mt-2 text-xs text-red-500">{goodsError}</p>}
          </div>
        )}

        {!funds && !goods && (
          <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
            No donation types selected yet. Toggle an option above to let volunteers know what this
            event accepts.
          </p>
        )}
      </div>
    </aside>
  )
}
