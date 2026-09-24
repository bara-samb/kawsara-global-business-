"use client";

import { useState } from "react";

type Customer = {
  id: string;
  name: string;
  reference: string;
  phone: string | null;
};

export function CustomerAutocomplete({ customers }: { customers: Customer[] }) {
  const [name, setName] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [phone, setPhone] = useState("");

  function handleChange(value: string) {
    setName(value);
    const match = customers.find(
      (customer) => `${customer.name} (${customer.reference})` === value || customer.name === value,
    );
    setCustomerId(match?.id ?? "");
    if (match?.phone) setPhone(match.phone);
  }

  return (
    <div>
      <label className="text-sm font-medium text-brand-green-900" htmlFor="sale-customer-name">
        Client (optionnel)
      </label>
      <input
        id="sale-customer-name"
        name="customerName"
        value={name}
        onChange={(event) => handleChange(event.target.value)}
        list="sale-customer-suggestions"
        placeholder="Nom complet du client..."
        autoComplete="off"
        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
      />
      <input type="hidden" name="customerId" value={customerId} />
      <label className="mt-3 block text-sm font-medium text-brand-green-900" htmlFor="sale-customer-phone">
        Numero de telephone (optionnel)
      </label>
      <input
        id="sale-customer-phone"
        name="customerPhone"
        type="tel"
        value={phone}
        onChange={(event) => setPhone(event.target.value)}
        placeholder="Ex. 77 123 45 67"
        autoComplete="tel"
        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
      />
      <datalist id="sale-customer-suggestions">
        {customers.map((customer) => (
          <option key={customer.id} value={`${customer.name} (${customer.reference})`} />
        ))}
      </datalist>
      <p className="mt-1 text-xs text-gray-500">
        Choisissez un client proposé ou saisissez un nom complet.
      </p>
    </div>
  );
}
