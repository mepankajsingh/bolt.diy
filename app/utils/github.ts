export const getGitHubHeaders = () => ({
  Accept: 'application/vnd.github.v3+json',
});

export const handleGitHubError = (error: { response?: { status: number } }) => {
  if (error.response?.status === 403) {
    throw new Error('GitHub API rate limit exceeded.');
  }

  throw error;
};
