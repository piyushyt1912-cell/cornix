import { useState } from 'react';
import { Star, Camera } from 'lucide-react';
import { Review, Member } from '@/lib/db';

interface ReviewsViewProps {
  reviews: Review[];
  members: Member[];
  onAddReview: (review: Review) => Promise<any>;
  isLightMode: boolean;
  role: 'admin' | 'receptionist';
}

export default function ReviewsView({ reviews, members, onAddReview, isLightMode, role }: ReviewsViewProps) {
  const [rating, setRating] = useState(5);
  const [selectedMemberName, setSelectedMemberName] = useState(members[0]?.name || '');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [text, setText] = useState('');

  // Calculate average rating
  const averageRating = reviews.length > 0 
    ? (reviews.reduce((sum, r) => sum + r.r, 0) / reviews.length).toFixed(1)
    : '0.0';

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!selectedMemberName) return;

    await onAddReview({
      name: selectedMemberName,
      text,
      r: rating,
      date
    });

    setText('');
    setRating(5);
  };

  return (
    <div className="w-full flex flex-col min-h-full pb-8">
      <header className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
           <h1 className={`font-heading text-2xl font-bold ${isLightMode ? 'text-gray-900' : 'text-white'}`}>
             Reviews & Testimonials <span className="text-[12px] text-text-secondary ml-2 font-normal font-sans">(समीक्षाएं)</span>
           </h1>
           <div className="flex items-center gap-2 mt-1.5">
              <div className="flex text-orange-400">
                {Array.from({length: 5}).map((_, i) => (
                  <Star key={i} size={14} fill={i < Math.round(Number(averageRating)) ? "currentColor" : "none"} className={i >= Math.round(Number(averageRating)) ? "opacity-30" : ""} />
                ))}
              </div>
              <span className={`text-sm font-bold ${isLightMode ? 'text-black' : 'text-white'}`}>{averageRating} / 5.0</span>
              <span className="text-xs text-text-secondary">from {reviews.length} reviews</span>
            </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {role === 'admin' && (
          <div className="lg:col-span-1 space-y-6">
             <div className="bg-surface border border-border-color p-5 rounded-xl sticky top-0">
                <h3 className="font-heading font-semibold text-[14px] text-text-secondary uppercase tracking-tight mb-4">Add Review</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                   <div className="space-y-2">
                      <label className="text-xs text-text-secondary font-semibold uppercase">Select Member</label>
                      <select required value={selectedMemberName} onChange={e => setSelectedMemberName(e.target.value)} className="w-full bg-[#0D0D0D] border border-border-color rounded-md px-3 py-2 text-sm text-white focus:outline-none">
                         <option value="">Choose a member...</option>
                         {members.map((m) => (
                           <option key={m.id} value={m.name}>{m.name}</option>
                         ))}
                      </select>
                   </div>
                   <div className="space-y-2">
                      <label className="text-xs text-text-secondary font-semibold uppercase">Rating</label>
                      <div className="flex gap-1 text-text-secondary cursor-pointer">
                         {[1, 2, 3, 4, 5].map((star) => (
                           <Star 
                             key={star} 
                             size={24} 
                             className={`hover:text-orange-400 hover:fill-orange-400 transition-all ${rating >= star ? 'text-orange-400 fill-orange-400' : ''}`}
                             onClick={() => setRating(star)}
                           />
                         ))}
                      </div>
                   </div>
                   <div className="space-y-2">
                      <label className="text-xs text-text-secondary font-semibold uppercase">Date</label>
                      <input required type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-[#0D0D0D] border border-border-color rounded-md px-3 py-2 text-sm text-white focus:outline-none [color-scheme:dark]" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-xs text-text-secondary font-semibold uppercase">Review Text</label>
                      <textarea required value={text} onChange={e => setText(e.target.value)} className="w-full bg-[#0D0D0D] border border-border-color rounded-md px-3 py-2 text-sm text-white focus:outline-none placeholder:text-text-secondary/50" rows={4} placeholder="What did they say?"></textarea>
                   </div>
                   <button type="submit" className="w-full bg-primary hover:bg-primary/90 text-[#000] px-4 py-2 rounded-md text-sm font-bold transition-colors mt-2">
                     Post Review
                   </button>
                </form>
             </div>
          </div>
        )}

        <div className={role === 'admin' ? 'lg:col-span-3' : 'lg:col-span-4'}>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reviews.map((rev, i) => (
                <div key={rev.id || i} className="bg-surface border border-border-color p-5 rounded-xl flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                         <div className="w-8 h-8 rounded-full bg-[#0D0D0D] border border-border-color flex items-center justify-center text-xs font-bold font-heading">
                            {rev.name.charAt(0)}
                         </div>
                         <div>
                            <div className={`font-bold ${isLightMode ? 'text-black' : 'text-white'} text-sm`}>{rev.name}</div>
                            <div className="text-[10px] text-text-secondary">{rev.date}</div>
                         </div>
                      </div>
                      <div className="flex text-orange-400">
                        {Array.from({length: 5}).map((_, idx) => (
                          <Star key={idx} size={12} fill="currentColor" className={idx >= rev.r ? "opacity-30" : ""} />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-text-secondary mb-4 italic">
                      &quot;{rev.text}&quot;
                    </p>
                  </div>
                  <div className="pt-3 border-t border-border-color flex justify-end">
                     <button 
                        onClick={() => {
                          navigator.clipboard.writeText(`"${rev.text}" - ${rev.name} (${rev.r} Stars at Corenix Club)`);
                          alert(`Copied review by ${rev.name} for Instagram!`);
                        }}
                        className="text-xs font-semibold text-primary hover:text-white transition-colors flex items-center gap-1"
                     >
                        <Camera size={12}/> Copy for Instagram
                     </button>
                  </div>
                </div>
              ))}
              {reviews.length === 0 && (
                <div className="col-span-2 text-center text-text-secondary py-12">No reviews recorded yet.</div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
}
