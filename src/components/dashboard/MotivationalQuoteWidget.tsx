import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Quote } from "lucide-react";

const motivationalQuotes = [
  { quote: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { quote: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { quote: "Innovation distinguishes between a leader and a follower.", author: "Steve Jobs" },
  { quote: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
  { quote: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { quote: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
  { quote: "Your time is limited, don't waste it living someone else's life.", author: "Steve Jobs" },
  { quote: "The only limit to our realization of tomorrow is our doubts of today.", author: "Franklin D. Roosevelt" },
  { quote: "Do what you can, with what you have, where you are.", author: "Theodore Roosevelt" },
  { quote: "Security is not a product, but a process.", author: "Bruce Schneier" },
  { quote: "In cybersecurity, the weakest link is usually the human element.", author: "Kevin Mitnick" },
  { quote: "The strength of the team is each individual member. The strength of each member is the team.", author: "Phil Jackson" },
  { quote: "Excellence is not a skill, it's an attitude.", author: "Ralph Marston" },
  { quote: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { quote: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { quote: "Success usually comes to those who are too busy to be looking for it.", author: "Henry David Thoreau" },
  { quote: "Don't be afraid to give up the good to go for the great.", author: "John D. Rockefeller" },
  { quote: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
  { quote: "Security is always excessive until it's not enough.", author: "Robbie Sinclair" },
  { quote: "Strive not to be a success, but rather to be of value.", author: "Albert Einstein" },
];

export function MotivationalQuoteWidget() {
  const [currentQuote, setCurrentQuote] = useState(motivationalQuotes[0]);

  // Get quote based on current date (changes daily)
  const getDailyQuote = () => {
    const today = new Date();
    const dayOfYear = Math.floor(
      (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
    );
    const index = dayOfYear % motivationalQuotes.length;
    return motivationalQuotes[index];
  };

  useEffect(() => {
    // Set the daily quote on initial load
    setCurrentQuote(getDailyQuote());
  }, []);

  return (
    <Card className="bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/10 border-primary/20 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-accent/5 rounded-full translate-y-1/2 -translate-x-1/2" />
      <CardContent className="p-4 relative">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-primary/10 shrink-0">
            <Quote className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground italic leading-relaxed">
              "{currentQuote.quote}"
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              — {currentQuote.author}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
