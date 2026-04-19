import { FertilizerLanding } from "@/components/fertilizer-landing";
import { Navbar } from "@/components/navbar";

export default function FertilizerPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <FertilizerLanding />
    </div>
  );
}
