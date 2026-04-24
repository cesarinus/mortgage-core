import { Button } from "@/components/ui/button";
import { Calculator } from "lucide-react";

interface FloatingCalculatorButtonProps {
  onClick: () => void;
}

const FloatingCalculatorButton = ({ onClick }: FloatingCalculatorButtonProps) => {
  return (
    <Button
      onClick={onClick}
      size="lg"
      className="btn-shadow fixed bottom-6 right-6 z-40 h-14 rounded-full px-5 shadow-lg hover:scale-105 transition-transform animate-fade-in"
      aria-label="Open mortgage calculator"
    >
      <Calculator className="mr-2 h-5 w-5" />
      <span className="hidden sm:inline">Calculate My Payment</span>
      <span className="sm:hidden">Calculate</span>
    </Button>
  );
};

export default FloatingCalculatorButton;