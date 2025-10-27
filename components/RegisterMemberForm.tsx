import React, { useState } from 'react';
import { Agent, NewMember } from '../types';

interface RegisterMemberFormProps {
  agent: Agent;
  onRegister: (member: NewMember) => Promise<void>;
}

export const RegisterMemberForm: React.FC<RegisterMemberFormProps> = ({ agent, onRegister }) => {
  const [formData, setFormData] = useState<NewMember>({
    full_name: '',
    phone: '',
    email: '',
    circle: agent.circle,
    registration_amount: 10,
    payment_status: 'complete',
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'registration_amount') {
        setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onRegister(formData);
      setFormData({
        full_name: '',
        phone: '',
        email: '',
        circle: agent.circle,
        registration_amount: 10,
        payment_status: 'complete',
      });
    } catch (error) {
      console.error("Caught registration error in form, toast should be displayed by parent.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="my-6 p-6 border border-slate-700 rounded-lg bg-slate-700 bg-opacity-50">
      <h3 className="text-xl font-semibold mb-4 text-gray-200">New Member Registration</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-gray-300">Full Name</label>
              <input type="text" name="full_name" id="full_name" value={formData.full_name} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md shadow-sm text-white focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm" />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300">Email Address</label>
              <input type="email" name="email" id="email" value={formData.email} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md shadow-sm text-white focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm" />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-300">Phone Number</label>
              <input type="tel" name="phone" id="phone" value={formData.phone} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md shadow-sm text-white focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm" />
            </div>
            <div>
              <label htmlFor="circle" className="block text-sm font-medium text-gray-300">Circle</label>
              <input type="text" name="circle" id="circle" value={formData.circle} readOnly className="mt-1 block w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-md shadow-sm text-gray-400 sm:text-sm" />
            </div>
            <div>
              <label htmlFor="registration_amount" className="block text-sm font-medium text-gray-300">Registration Amount ($)</label>
              <input type="number" name="registration_amount" id="registration_amount" min="10" value={formData.registration_amount} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md shadow-sm text-white focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm" />
            </div>
            <div>
                <label htmlFor="payment_status" className="block text-sm font-medium text-gray-300">Payment Type</label>
                <select id="payment_status" name="payment_status" value={formData.payment_status} onChange={handleChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-slate-800 border-slate-600 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm rounded-md text-white">
                    <option value="complete">Full Payment</option>
                    <option value="installment">Installment</option>
                </select>
            </div>
        </div>
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-700 focus:ring-green-500 disabled:bg-gray-500"
          >
            {isLoading ? 'Generating Welcome...' : 'Register Member'}
          </button>
        </div>
      </form>
    </div>
  );
};
