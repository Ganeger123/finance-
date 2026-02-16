import React from 'react';

interface StatCardProps {
    title: string;
    value: string;
    accentColor: 'turquoise' | 'blue' | 'coral' | 'green';
    footer?: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, accentColor, footer }) => {
    const accentClasses = {
        turquoise: 'border-accent-turquoise',
        blue: 'border-accent-blue',
        coral: 'border-accent-coral',
        green: 'border-accent-green',
    };

    const bgAccents = {
        turquoise: 'bg-accent-turquoise/5',
        blue: 'bg-accent-blue/5',
        coral: 'bg-accent-coral/5',
        green: 'bg-accent-green/5',
    };

    return (
        <div className={`fintrack-card p-8 flex flex-col justify-between overflow-hidden relative group border-b-8 ${accentClasses[accentColor]}`}>
            <div className={`absolute -right-8 -top-8 w-32 h-32 rounded-full ${bgAccents[accentColor]} blur-3xl group-hover:scale-150 transition-transform duration-700`} />

            <div className="relative z-10">
                <h3 className="text-slate-400 font-bold text-[10px] mb-6 uppercase tracking-[0.2em]">{title}</h3>
                <p className="text-3xl font-black text-slate-800 tracking-tighter group-hover:text-indigo-900 transition-colors uppercase">{value}</p>
            </div>

            {footer && (
                <div className="relative z-10 mt-8 pt-4 border-t border-slate-50">
                    {footer}
                </div>
            )}
        </div>
    );
};

export default StatCard;
