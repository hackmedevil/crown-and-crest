import { useFormContext } from "react-hook-form";
import { useState } from "react";

export default function WashInstructionTab() {
  const { register } = useFormContext();
  // Mocked wash instructions; replace with API fetch as needed
  const [washInstructions] = useState([
    { id: '1', name: 'Delicate Wash' },
    { id: '2', name: 'Machine Wash' },
    { id: '3', name: 'Hand Wash Only' },
  ]);

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Wash Instruction</h2>
      <div>
        <label htmlFor="wash_instruction_id" className="block text-sm font-medium text-gray-700 mb-1">
          Assign Wash Instruction
        </label>
        <select
          id="wash_instruction_id"
          {...register("wash_instruction_id", {
            setValueAs: (v) => (v === "" ? null : v),
          })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">No wash instruction</option>
          {washInstructions.map((wi) => (
            <option key={wi.id} value={wi.id}>{wi.name}</option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500">Assign a wash instruction profile for care guidance</p>
      </div>
    </div>
  );
}
