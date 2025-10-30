import React, { useState } from 'react';

interface CommonsInductionProps {
  onComplete: () => void;
}

const inductionScreens = [
  {
    title: "The Question of Fairness",
    questions: [
      "Do you ever feel like the economy was designed for a few — while the rest of us are left competing for scraps?",
      "Do you believe an economy should be built on fairness, not privilege — where everyone’s effort contributes to shared strength?",
    ],
    buttons: { yes: "Yes, I do", no: "Not really" },
    onYesText: "Then you already understand the first truth of the Global Commons: Real wealth isn’t what one person keeps — it’s what many people build together.",
  },
  {
    title: "The Vision",
    questions: [
      "Imagine an economy where your contribution, no matter how small, helps lift others — and theirs lifts you.",
      "Where progress isn’t a competition, but a shared inheritance.",
      "Would you want to be part of that kind of economy?",
    ],
    buttons: { yes: "Yes, I would", no: "Not sure yet" },
    onYesText: "That’s the heart of the Global Commons — a new people’s economy built on collective effort, trust, and real value.",
  },
  {
    title: "The Shared Inheritance",
    questions: [
      "What if you could hold a token of that shared inheritance — a digital asset that represents your stake in the well-being of others?",
      "Each unit symbolises access: to food, opportunities, emergency help, and growth.",
      "Would you value an asset that grows stronger as your community prospers?",
    ],
    buttons: { yes: "Yes", no: "No" },
    onYesText: "That’s what $UBT represents — not just currency, but shared potential.",
  },
  {
    title: "The Human Moment",
    questions: [
      "Have there been times you’ve faced a financial challenge alone — wishing there was a system that cared as much as you do?",
    ],
    buttons: { yes: "Yes", no: "No" },
    onYesText: "You’re not alone. Most of us have lived that moment — and that’s why this movement exists: to turn shared vulnerability into shared power.",
  },
];

const FinalChoiceScreen = ({ onComplete }: { onComplete: () => void }) => {
  const handleVerify = () => {
    const WHATSAPP_MESSAGE = "I am interested in being a member of the global commons. I want to secure my $UBT shares now.";
    const WHATSAPP_LINK = `https://wa.me/447446959717?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;
    window.open(WHATSAPP_LINK, '_blank');
    onComplete();
  };

  return (
    <div className="text-center">
      <h2 className="text-3xl font-bold text-white mb-6">The Choice</h2>
      <p className="text-lg text-gray-300 mb-4">You can start owning your share in the Commons — gradually — with small instalments.</p>
      <p className="text-lg text-gray-300 mb-8">You don’t have to be rich. You just have to believe that a fairer economy begins when ordinary people unite.</p>
      <h3 className="text-xl font-semibold text-white mb-8">Would you like to begin your journey toward verified membership and ownership in the Global Commons?</h3>
      <div className="space-y-4 max-w-sm mx-auto">
        <button
          onClick={handleVerify}
          className="w-full text-left p-4 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-lg font-semibold"
        >
          ✅ Yes — I want to start my $UBT journey
        </button>
        <button
          onClick={onComplete}
          className="w-full text-left p-4 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-lg"
        >
          🤔 I’d like to explore the Commons first
        </button>
      </div>
      <p className="text-sm text-gray-500 mt-8">Note: Key features like distress calls, earning opportunities, and food dividends are only available to verified members.</p>
    </div>
  );
};


export const CommonsInduction: React.FC<CommonsInductionProps> = ({ onComplete }) => {
  const [screenIndex, setScreenIndex] = useState(0);
  const [showFollowUp, setShowFollowUp] = useState(false);

  const currentScreen = inductionScreens[screenIndex];

  const handleNext = () => {
    setShowFollowUp(true);
    setTimeout(() => {
      setShowFollowUp(false);
      setScreenIndex(prev => prev + 1);
    }, 3500);
  };
  
  const handleSkip = () => {
      setShowFollowUp(false);
      setScreenIndex(prev => prev + 1);
  };

  return (
    <div className="fixed inset-0 bg-slate-900 z-50 flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-3xl mx-auto">
        {screenIndex < inductionScreens.length ? (
          <div className="text-center animate-fade-in">
            {showFollowUp ? (
              <div className="animate-fade-in">
                 <p className="text-3xl font-semibold text-green-400 leading-relaxed">{currentScreen.onYesText}</p>
              </div>
            ) : (
              <>
                <h2 className="text-3xl font-bold text-white mb-8">{currentScreen.title}</h2>
                <div className="space-y-6 text-2xl text-gray-200 leading-normal">
                  {currentScreen.questions.map((q, i) => <p key={i}>{q}</p>)}
                </div>
                <div className="mt-12 flex justify-center gap-6">
                  <button
                    onClick={handleNext}
                    className="px-10 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xl font-semibold transition-transform transform hover:scale-105"
                  >
                    {currentScreen.buttons.yes}
                  </button>
                  <button
                    onClick={handleSkip}
                    className="px-10 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xl transition-colors"
                  >
                    {currentScreen.buttons.no}
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
            <div className="animate-fade-in">
                <FinalChoiceScreen onComplete={onComplete} />
            </div>
        )}
      </div>
    </div>
  );
};
