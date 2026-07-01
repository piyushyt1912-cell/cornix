import { useState } from 'react';
import { Plus, Gift, Star, Users, MessageCircle } from 'lucide-react';
import { Offer } from '@/lib/db';
import { useToast } from '@/components/Toast';

interface OffersViewProps {
  offers: Offer[];
  onAddOffer: (offer: Offer) => Promise<any>;
  isLightMode: boolean;
  role: 'admin' | 'receptionist';
}

export default function OffersView({ offers, onAddOffer, isLightMode, role }: OffersViewProps) {
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [discount, setDiscount] = useState('20');
  const [target, setTarget] = useState('All Members');
  const [description, setDescription] = useState('');

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    try {
      await onAddOffer({
        name,
        target,
        date,
        count: '0 claimed'
      });
      setName('');
      setDescription('');
      showToast('Offer broadcast saved successfully to Firestore!', 'success');
    } catch (err) {
      showToast('Failed to save offer broadcast', 'error');
    }
  };

  const selectTemplate = (title: string, desc: string, discountVal: string, targetGroup: string) => {
    setName(title);
    setDescription(desc);
    setDiscount(discountVal);
    setTarget(targetGroup);
  };

  const previewText = `Hey [Name]! 👋

Grab our ${name || 'Promo Offer'} (${discount}% Off) on all renewals!

Valid till: ${date}
${description ? `T&C: ${description}` : ''}

Reply YES to claim.`;

  return (
    <div className="w-full flex flex-col min-h-full pb-8">
      <header className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className={`font-heading text-2xl font-bold ${isLightMode ? 'text-gray-900' : 'text-white'}`}>
          Offers & Promotions
        </h1>
      </header>

      {role === 'admin' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 space-y-6">
           <div className="bg-surface border border-border-color p-5 rounded-xl">
             <h3 className="font-heading font-semibold text-[14px] text-text-secondary uppercase tracking-tight mb-4">Create New Offer</h3>
             <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <label className="text-xs text-text-secondary font-semibold uppercase">Offer Title</label>
                      <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-[#0D0D0D] border border-border-color rounded-md px-3 py-2 text-sm text-white focus:border-primary/50 focus:outline-none" placeholder="e.g. Summer Special 20% Off" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-xs text-text-secondary font-semibold uppercase">Valid Till</label>
                      <input required type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-[#0D0D0D] border border-border-color rounded-md px-3 py-2 text-sm text-white focus:border-primary/50 focus:outline-none [color-scheme:dark]" />
                   </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <label className="text-xs text-text-secondary font-semibold uppercase">Discount (%)</label>
                      <input required type="number" value={discount} onChange={e => setDiscount(e.target.value)} className="w-full bg-[#0D0D0D] border border-border-color rounded-md px-3 py-2 text-sm text-white focus:border-primary/50 focus:outline-none" placeholder="20" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-xs text-text-secondary font-semibold uppercase">Target Group</label>
                      <select value={target} onChange={e => setTarget(e.target.value)} className="w-full bg-[#0D0D0D] border border-border-color rounded-md px-3 py-2 text-sm text-white focus:border-primary/50 focus:outline-none">
                         <option>All Members</option>
                         <option>Expiring This Month</option>
                         <option>Inactive Members</option>
                         <option>Specific Member</option>
                      </select>
                   </div>
                </div>
                <div className="space-y-2">
                   <label className="text-xs text-text-secondary font-semibold uppercase">Description (Optional)</label>
                   <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-[#0D0D0D] border border-border-color rounded-md px-3 py-2 text-sm text-white focus:border-primary/50 focus:outline-none" rows={2} placeholder="Terms and conditions..."></textarea>
                </div>
                
                <div className="pt-4 border-t border-border-color">
                   <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><MessageCircle size={16}/> Send Via</h4>
                   <div className="flex gap-4">
                     <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" className="accent-green-500 w-4 h-4" defaultChecked readOnly />
                        <span className="text-sm text-text-secondary">WhatsApp Broadcast</span>
                     </label>
                     <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" className="accent-primary w-4 h-4" />
                        <span className="text-sm text-text-secondary">SMS</span>
                     </label>
                   </div>
                </div>

                <button type="submit" className="bg-primary hover:bg-primary/90 text-white font-bold px-6 py-2 rounded">Broadcast Promotion</button>
             </form>
           </div>
        </div>
        
        <div className="space-y-6">
           <div className="bg-surface border border-border-color p-5 rounded-xl">
             <h3 className="font-heading font-semibold text-[14px] text-text-secondary uppercase tracking-tight mb-4">Quick Templates</h3>
             <div className="flex flex-col gap-3">
               <button onClick={() => selectTemplate('Birthday Special', 'Valid on birthday week. Single use.', '20', 'All Members')} className="flex items-center gap-3 p-3 bg-[#0D0D0D] rounded-lg border border-border-color text-left hover:border-primary/50 transition-colors group">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-[#0D0D0D] transition-colors"><Gift size={20} /></div>
                  <div>
                     <div className="text-sm font-bold text-white">Birthday Offer</div>
                     <div className="text-xs text-text-secondary">Send automated 20% off</div>
                  </div>
               </button>
               <button onClick={() => selectTemplate('Festival Special', 'Flat ₹1000 off on Yearly memberships.', '15', 'All Members')} className="flex items-center gap-3 p-3 bg-[#0D0D0D] rounded-lg border border-border-color text-left hover:border-primary/50 transition-colors group">
                  <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-colors"><Star size={20} /></div>
                  <div>
                     <div className="text-sm font-bold text-white">Festival Special</div>
                     <div className="text-xs text-text-secondary">Flat ₹1000 off on yearly</div>
                  </div>
               </button>
               <button onClick={() => selectTemplate('Referral Incentive', 'Get 1 month free when you refer a friend.', '100', 'All Members')} className="flex items-center gap-3 p-3 bg-[#0D0D0D] rounded-lg border border-border-color text-left hover:border-primary/50 transition-colors group">
                  <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors"><Users size={20} /></div>
                  <div>
                     <div className="text-sm font-bold text-white">Referral Program</div>
                     <div className="text-xs text-text-secondary">1 free month for bringing a friend</div>
                  </div>
               </button>
             </div>
           </div>

           <div className="bg-[#0D0D0D] border border-border-color p-4 rounded-xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-2 opacity-10"><MessageCircle size={100} /></div>
             <h4 className="text-xs font-semibold text-text-secondary uppercase mb-2 relative">WhatsApp Preview</h4>
             <div className="bg-[#1a1a1a] rounded-lg p-3 text-sm text-white/90 relative shadow-inner border border-border-color/50 whitespace-pre-line">
               {previewText}
             </div>
           </div>
         </div>
       </div>
      )}

      <div className="bg-surface border border-border-color rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border-color flex justify-between items-center bg-[#0D0D0D]/30">
          <h3 className="font-heading font-semibold text-[14px] text-text-secondary uppercase tracking-tight">Offer History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#0D0D0D] border-b border-border-color text-text-secondary text-[11px] uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3 font-medium">Offer Name</th>
                <th className="px-5 py-3 font-medium">Target</th>
                <th className="px-5 py-3 font-medium">Sent Date</th>
                <th className="px-5 py-3 font-medium text-right">Responses</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-color">
              {offers.map((row, i) => (
                <tr key={row.id || i} className="hover:bg-[#0D0D0D]/50 transition-colors">
                  <td className="px-5 py-3 font-medium text-white">{row.name}</td>
                  <td className="px-5 py-3 text-text-secondary">{row.target}</td>
                  <td className="px-5 py-3 text-text-secondary">{row.date}</td>
                  <td className="px-5 py-3 text-right font-medium text-primary">{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
