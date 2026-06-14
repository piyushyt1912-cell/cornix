import { useState, useEffect } from 'react';
import { Search, ChevronDown, MessageCircle, AlertTriangle } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import { Member, Measurement, getMeasurements, addMeasurement } from '@/lib/db';

interface MeasurementsViewProps {
  members: Member[];
  isLightMode: boolean;
}

export default function MeasurementsView({ members, isLightMode }: MeasurementsViewProps) {
  const [selectedPhone, setSelectedPhone] = useState(members[0]?.phone || '');
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(false);

  // Form states
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [weight, setWeight] = useState('79');
  const [height, setHeight] = useState('178');
  const [bodyFat, setBodyFat] = useState('18.5');
  const [chest, setChest] = useState('42');
  const [waist, setWaist] = useState('34');
  const [arms, setArms] = useState('15.5');

  const selectedMember = members.find(m => m.phone === selectedPhone);

  useEffect(() => {
    async function loadMeasurements() {
      if (!selectedPhone) return;
      setLoading(true);
      try {
        const fetched = await getMeasurements(selectedPhone);
        // Sort measurements by date asc for the progress line chart
        fetched.sort((a, b) => a.date.localeCompare(b.date));
        setMeasurements(fetched);

        // Prepopulate form values with latest measurement if available
        if (fetched.length > 0) {
          const latest = fetched[fetched.length - 1];
          setWeight(latest.weight.toString());
          setHeight(latest.height.toString());
          setBodyFat(latest.bodyFat.toString());
          setChest(latest.chest.toString());
          setWaist(latest.waist.toString());
          setArms(latest.arms.toString());
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadMeasurements();
  }, [selectedPhone]);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!selectedPhone) return;

    const data: Measurement = {
      phone: selectedPhone,
      date,
      weight: parseFloat(weight),
      height: parseFloat(height),
      bodyFat: parseFloat(bodyFat),
      chest: parseFloat(chest),
      waist: parseFloat(waist),
      arms: parseFloat(arms)
    };

    try {
      const saved = await addMeasurement(data);
      setMeasurements([...measurements, saved].sort((a, b) => a.date.localeCompare(b.date)));
      alert('Measurements saved successfully to Firestore!');
    } catch (err) {
      console.error(err);
    }
  };

  const lineData = {
    labels: measurements.map(m => m.date.slice(5)), // MM-DD format labels
    datasets: [
      {
        label: 'Weight (kg)',
        data: measurements.map(m => m.weight),
        borderColor: 'rgba(255, 51, 51, 1)',
        backgroundColor: 'rgba(255, 51, 51, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#0D0D0D',
        pointBorderColor: 'rgba(255, 51, 51, 1)',
      }
    ]
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { grid: { color: '#333' } },
      x: { grid: { display: false } },
    }
  };

  // Get current stats
  const latestStat = measurements[measurements.length - 1] || null;
  const bmi = (latestStat && latestStat.height > 0)
    ? (latestStat.weight / ((latestStat.height / 100) * (latestStat.height / 100))).toFixed(1)
    : '0.0';

  return (
    <div className="w-full flex flex-col min-h-full pb-8">
      <header className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className={`font-heading text-2xl font-bold ${isLightMode ? 'text-gray-900' : 'text-white'}`}>
          Body Measurements
        </h1>
        <div className="flex items-center gap-3">
          <div className="bg-[#0D0D0D] border border-border-color rounded-md px-3 py-2 flex items-center min-w-[250px]">
            <Search size={16} className="text-text-secondary mr-2" />
            <select value={selectedPhone} onChange={e => setSelectedPhone(e.target.value)} className="bg-transparent border-none text-sm text-white focus:outline-none w-full appearance-none">
              {members.map(m => (
                <option key={m.id} value={m.phone} className="bg-surface text-white">{m.name} ({m.phone})</option>
              ))}
            </select>
            <ChevronDown size={14} className="text-text-secondary ml-2" />
          </div>
        </div>
      </header>

      {selectedMember ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-surface border border-border-color p-5 rounded-xl">
               <div className="flex justify-between items-center mb-4">
                 <h3 className="font-heading font-semibold text-[14px] text-text-secondary uppercase tracking-tight">Add New Reading</h3>
                 <span className="text-xs text-text-secondary">Last updated: {latestStat ? latestStat.date : 'Never'}</span>
               </div>
               <form onSubmit={handleSubmit} className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                     <label className="text-[10px] text-text-secondary font-semibold uppercase">Date</label>
                     <input required type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-[#0D0D0D] border border-border-color rounded-md px-3 py-2 text-sm text-white focus:outline-none [color-scheme:dark]" />
                  </div>
                  <div className="space-y-1">
                     <label className="text-[10px] text-text-secondary font-semibold uppercase">Weight (kg)</label>
                     <input required type="number" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} className="w-full bg-[#0D0D0D] border border-border-color rounded-md px-3 py-2 text-sm text-white focus:outline-none" />
                  </div>
                  <div className="space-y-1">
                     <label className="text-[10px] text-text-secondary font-semibold uppercase">Height (cm)</label>
                     <input required type="number" value={height} onChange={e => setHeight(e.target.value)} className="w-full bg-[#0D0D0D] border border-border-color rounded-md px-3 py-2 text-sm text-white focus:outline-none" />
                  </div>
                  <div className="space-y-1">
                     <label className="text-[10px] text-text-secondary font-semibold uppercase">Body Fat %</label>
                     <input required type="number" step="0.1" value={bodyFat} onChange={e => setBodyFat(e.target.value)} className="w-full bg-[#0D0D0D] border border-border-color rounded-md px-3 py-2 text-sm text-white focus:outline-none" />
                  </div>
                  <div className="space-y-1">
                     <label className="text-[10px] text-text-secondary font-semibold uppercase">Chest (in)</label>
                     <input required type="number" step="0.1" value={chest} onChange={e => setChest(e.target.value)} className="w-full bg-[#0D0D0D] border border-border-color rounded-md px-3 py-2 text-sm text-white focus:outline-none" />
                  </div>
                  <div className="space-y-1">
                     <label className="text-[10px] text-text-secondary font-semibold uppercase">Waist (in)</label>
                     <input required type="number" step="0.1" value={waist} onChange={e => setWaist(e.target.value)} className="w-full bg-[#0D0D0D] border border-border-color rounded-md px-3 py-2 text-sm text-white focus:outline-none" />
                  </div>
                  <div className="space-y-1">
                     <label className="text-[10px] text-text-secondary font-semibold uppercase">Arms (in)</label>
                     <input required type="number" step="0.1" value={arms} onChange={e => setArms(e.target.value)} className="w-full bg-[#0D0D0D] border border-border-color rounded-md px-3 py-2 text-sm text-white focus:outline-none" />
                  </div>
                  <div className="space-y-1 flex items-end">
                    <button type="submit" className="w-full bg-primary hover:bg-primary/90 text-[#0D0D0D] px-3 py-2 rounded-md text-sm font-bold transition-colors">
                      Save Record
                    </button>
                  </div>
               </form>
            </div>

            <div className="bg-surface border border-border-color p-5 rounded-xl line-chart-container">
               <div className="flex justify-between items-center mb-4">
                  <h3 className="font-heading font-semibold text-[14px] text-text-secondary uppercase tracking-tight">Weight Progress</h3>
                  <div className="text-xs font-bold text-green-500 bg-green-500/10 px-2 py-1 rounded">
                    {measurements.length > 1 
                      ? `${(measurements[measurements.length - 1].weight - measurements[0].weight).toFixed(1)} kg Change`
                      : '0.0 kg Change'}
                  </div>
               </div>
               <div className="h-[200px] w-full">
                  {measurements.length > 0 ? (
                    <Line data={lineData} options={lineOptions} />
                  ) : (
                    <div className="h-full flex items-center justify-center text-text-secondary text-sm">No measurements recorded to plot.</div>
                  )}
               </div>
            </div>
          </div>

          <div className="space-y-6">
             <div className="bg-surface border border-border-color p-5 rounded-xl">
               <div className="flex justify-between items-center mb-4">
                  <h3 className="font-heading font-semibold text-[14px] text-text-secondary uppercase tracking-tight">Current Stats</h3>
                  <div className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded font-bold">BMI {bmi}</div>
               </div>
               <div className="space-y-3">
                 <div className="flex justify-between items-center border-b border-border-color pb-2">
                   <span className="text-sm text-text-secondary">Weight</span>
                   <span className="font-mono text-white">{latestStat ? `${latestStat.weight} kg` : 'N/A'}</span>
                 </div>
                 <div className="flex justify-between items-center border-b border-border-color pb-2">
                   <span className="text-sm text-text-secondary">Body Fat</span>
                   <span className="font-mono text-white">{latestStat ? `${latestStat.bodyFat}%` : 'N/A'}</span>
                 </div>
                 <div className="flex justify-between items-center border-b border-border-color pb-2">
                   <span className="text-sm text-text-secondary">Chest</span>
                   <span className="font-mono text-white">{latestStat ? `${latestStat.chest}"` : 'N/A'}</span>
                 </div>
                 <div className="flex justify-between items-center border-b border-border-color pb-2">
                   <span className="text-sm text-text-secondary">Waist</span>
                   <span className="font-mono text-white">{latestStat ? `${latestStat.waist}"` : 'N/A'}</span>
                 </div>
                 <div className="flex justify-between items-center">
                   <span className="text-sm text-text-secondary">Arms</span>
                   <span className="font-mono text-white">{latestStat ? `${latestStat.arms}"` : 'N/A'}</span>
                 </div>
               </div>
               
               {latestStat && (
                 <button 
                    onClick={() => {
                        if (!selectedMember) return;
                        const msg = encodeURIComponent(`Hello ${selectedMember.name},\n\nHere are your current measurement stats from Corenix Club:\nWeight: ${latestStat.weight}kg\nBody Fat: ${latestStat.bodyFat}%\nBMI: ${bmi}\n\nKeep up the great progress! 💪\n- Corenix Team`);
                        window.open(`https://wa.me/${selectedMember.phone}?text=${msg}`);
                    }}
                    className="w-full mt-6 bg-[#25D366] hover:bg-[#1ebd58] text-white px-3 py-2 rounded-md text-sm font-bold transition-colors flex items-center justify-center gap-2">
                    <MessageCircle size={16} /> Send Report via WhatsApp
                 </button>
               )}
             </div>
             
             <div className="bg-orange-500/10 border border-orange-500/30 p-4 rounded-xl">
               <h4 className="text-sm font-semibold text-orange-500 flex items-center gap-2 mb-2"><AlertTriangle size={16} /> Pending Updates</h4>
               <p className="text-xs text-text-secondary mb-3">Keep member stats up to date by recording readings monthly.</p>
             </div>
          </div>
        </div>
      ) : (
        <div className="text-center text-text-secondary py-12 bg-surface rounded-xl border border-border-color">
          No members registered in system to view measurements.
        </div>
      )}
    </div>
  );
}
