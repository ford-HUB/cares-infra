import { MapPin, UserPlus, X } from 'lucide-react'
import type { AssistanceRequest } from '../../../types/assistance-request'

interface TargetBeneficiaryFieldProps {
  selected: AssistanceRequest[]
  onOpen: () => void
  onRemove: (id: string) => void
}

/** The chosen targets as chips, plus the button that opens the picker. */
export function TargetBeneficiaryField({ selected, onOpen, onRemove }: TargetBeneficiaryFieldProps) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">Target beneficiaries</label>
        <button
          type="button"
          onClick={onOpen}
          className="flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          <UserPlus size={14} />
          {selected.length > 0 ? 'Edit selection' : 'Select beneficiaries'}
        </button>
      </div>
      {selected.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 p-3 text-xs text-gray-500">
          No beneficiaries targeted yet. Pick from approved assistance requests — the event
          location is set to the first selected beneficiary's pinned location.
        </p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {selected.map((request) => (
            <li
              key={request.id}
              className="flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 py-1 pr-1.5 pl-3 text-xs text-green-900"
            >
              {request.location && <MapPin size={12} className="text-red-500" />}
              <span className="font-medium">{request.requester.name}</span>
              <span className="text-green-700">· {request.title}</span>
              <button
                type="button"
                onClick={() => onRemove(request.id)}
                aria-label={`Remove ${request.requester.name}`}
                className="rounded-full p-0.5 hover:bg-green-100"
              >
                <X size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
