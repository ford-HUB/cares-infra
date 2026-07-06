import { DollarSign, Package, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { GOODS_TYPE_OPTIONS } from '../../../constants/event'
import type { CaresEvent, DonationOptionsPayload } from '../../../types/event'
import { ToggleSwitch } from '../ui/toggle-switch'

interface DonationOptionsModalProps {
  event: CaresEvent
  open: boolean
  onClose: () => void
  onConfirm: (options: DonationOptionsPayload) => void
}

export function DonationOptionsModal({
  event,
  open,
  onClose,
  onConfirm,
}: DonationOptionsModalProps) {
  const [funds, setFunds] = useState(false)
  const [goods, setGoods] = useState(false)
  const [goodsTypes, setGoodsTypes] = useState<string[]>([])

  useEffect(() => {
    if (open && event) {
      setFunds(event.funds_donation)
      setGoods(event.goods_donation)
      setGoodsTypes(event.goods_types ?? [])
    }
  }, [open, event])

  if (!open) return null

  const canSubmit = funds || goods ? (goods ? goodsTypes.length > 0 : true) : true

  const toggleGoodsType = (id: string) => {
    setGoodsTypes((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    )
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Donation Options</h3>
            <p className="text-sm text-gray-500">{event.title}</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3">
          <ToggleSwitch
            checked={funds}
            onChange={setFunds}
            label="Monetary Donations"
            description="Accept cash, bank transfers, and online payments"
            icon={<DollarSign className="h-5 w-5" />}
          />

          <ToggleSwitch
            checked={goods}
            onChange={(checked) => {
              setGoods(checked)
              if (checked && goodsTypes.length === 0) {
                setGoodsTypes(GOODS_TYPE_OPTIONS.map((g) => g.id))
              }
              if (!checked) setGoodsTypes([])
            }}
            label="Goods & Supplies"
            description="Accept physical items and materials"
            icon={<Package className="h-5 w-5" />}
          />

          {goods && (
            <div className="ml-2 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="mb-2 text-sm font-medium text-gray-700">Goods types needed</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {GOODS_TYPE_OPTIONS.map((gt) => {
                  const Icon = gt.icon
                  const selected = goodsTypes.includes(gt.id)
                  return (
                    <label
                      key={gt.id}
                      className={`flex cursor-pointer items-center gap-2 rounded-md border-2 p-2 text-xs ${
                        selected
                          ? `${gt.borderColor} ${gt.bgColor}`
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleGoodsType(gt.id)}
                        className="rounded"
                      />
                      <Icon className={`h-4 w-4 ${gt.color}`} />
                      <span>{gt.name}</span>
                    </label>
                  )
                })}
              </div>
              {goods && goodsTypes.length === 0 && (
                <p className="mt-2 text-xs text-red-500">Select at least one goods type</p>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() =>
              onConfirm({ funds, goods, goodsTypes: goods ? goodsTypes : [] })
            }
            className="rounded-lg bg-[var(--cares-primary)] px-4 py-2 text-white hover:bg-[var(--cares-primary-hover)] disabled:opacity-50"
          >
            Save Options
          </button>
        </div>
      </div>
    </div>
  )
}
