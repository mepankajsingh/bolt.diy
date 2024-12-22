export const loader = async () => {
  // You'll want to replace this with actual provider status checks
  const providerStatus = {
    openai: { status: 'online' as const },
    anthropic: { status: 'online' as const },
    cohere: { status: 'online' as const },
    mistral: { status: 'online' as const },
    google: { status: 'online' as const },
  };

  return new Response(JSON.stringify(providerStatus), {
    headers: { 'Content-Type': 'application/json' },
  });
};
