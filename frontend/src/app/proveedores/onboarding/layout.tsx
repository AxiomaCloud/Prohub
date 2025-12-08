// Layout público para onboarding - sin sidebar ni autenticación
export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Devolver solo los children sin ningún wrapper de layout autenticado
  return <>{children}</>;
}
