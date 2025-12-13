"use client";

export function Glow() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {/* Cyan glow top-left */}
      <div
        className="absolute -top-40 -left-40 w-80 h-80 rounded-full opacity-20 blur-3xl"
        style={{
          background: "radial-gradient(circle, rgba(0,255,255,0.6) 0%, transparent 70%)",
        }}
      />
      
      {/* Blue glow top-right */}
      <div
        className="absolute top-20 right-20 w-96 h-96 rounded-full opacity-15 blur-3xl"
        style={{
          background: "radial-gradient(circle, rgba(59,130,246,0.5) 0%, transparent 70%)",
        }}
      />
      
      {/* Purple glow bottom-center */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-10 blur-3xl"
        style={{
          background: "radial-gradient(circle, rgba(139,92,246,0.4) 0%, transparent 70%)",
        }}
      />
    </div>
  );
}

