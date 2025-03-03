import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { classNames } from '~/utils/classNames';
import { Progress } from '~/components/ui/Progress';
import { useToast } from '~/components/ui/use-toast';
import { Button } from '~/components/ui/Button';
import { Input } from '~/components/ui/Input';
import { debounce } from '~/utils/debounce';

interface OllamaModelInstallerProps {
  onModelInstalled: () => void;
  baseUrl?: string;
}

interface InstallProgress {
  status: string;
  progress: number;
  downloadedSize?: string;
  totalSize?: string;
  speed?: string;
}

interface ModelInfo {
  name: string;
  desc: string;
  size: string;
  tags: string[];
  installedVersion?: string;
  latestVersion?: string;
  needsUpdate?: boolean;
  status?: 'idle' | 'installing' | 'updating' | 'updated' | 'error';
  details?: {
    family: string;
    parameter_size: string;
    quantization_level: string;
  };
}

const POPULAR_MODELS: ModelInfo[] = [
  {
    name: 'deepseek-coder:6.7b',
    desc: "DeepSeek's code generation model",
    size: '4.1GB',
    tags: ['coding', 'popular'],
  },
  {
    name: 'llama2:7b',
    desc: "Meta's Llama 2 (7B parameters)",
    size: '3.8GB',
    tags: ['general', 'popular'],
  },
  {
    name: 'mistral:7b',
    desc: "Mistral's 7B model",
    size: '4.1GB',
    tags: ['general', 'popular'],
  },
  {
    name: 'gemma:7b',
    desc: "Google's Gemma model",
    size: '4.0GB',
    tags: ['general', 'new'],
  },
  {
    name: 'codellama:7b',
    desc: "Meta's Code Llama model",
    size: '4.1GB',
    tags: ['coding', 'popular'],
  },
  {
    name: 'neural-chat:7b',
    desc: "Intel's Neural Chat model",
    size: '4.1GB',
    tags: ['chat', 'popular'],
  },
  {
    name: 'phi:latest',
    desc: "Microsoft's Phi-2 model",
    size: '2.7GB',
    tags: ['small', 'fast'],
  },
  {
    name: 'qwen:7b',
    desc: "Alibaba's Qwen model",
    size: '4.1GB',
    tags: ['general'],
  },
  {
    name: 'solar:10.7b',
    desc: "Upstage's Solar model",
    size: '6.1GB',
    tags: ['large', 'powerful'],
  },
  {
    name: 'openchat:7b',
    desc: 'Open-source chat model',
    size: '4.1GB',
    tags: ['chat', 'popular'],
  },
  {
    name: 'dolphin-phi:2.7b',
    desc: 'Lightweight chat model',
    size: '1.6GB',
    tags: ['small', 'fast'],
  },
  {
    name: 'stable-code:3b',
    desc: 'Lightweight coding model',
    size: '1.8GB',
    tags: ['coding', 'small'],
  },
];

function formatBytes(bytes: number): string {
  if (bytes === 0) {
    return '0 B';
  }

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatSpeed(bytesPerSecond: number): string {
  return `${formatBytes(bytesPerSecond)}/s`;
}

// Add Ollama Icon SVG component
function OllamaIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 1024 1024" className={className} fill="currentColor">
      <path d="M684.3 322.2H339.8c-9.5.1-17.7 6.8-19.6 16.1-8.2 41.4-12.4 83.5-12.4 125.7 0 42.2 4.2 84.3 12.4 125.7 1.9 9.3 10.1 16 19.6 16.1h344.5c9.5-.1 17.7-6.8 19.6-16.1 8.2-41.4 12.4-83.5 12.4-125.7 0-42.2-4.2-84.3-12.4-125.7-1.9-9.3-10.1-16-19.6-16.1zM512 640c-176.7 0-320-143.3-320-320S335.3 0 512 0s320 143.3 320 320-143.3 320-320 320z" />
    </svg>
  );
}

export default function OllamaModelInstaller({
  onModelInstalled,
  baseUrl = 'http://127.0.0.1:11434',
}: OllamaModelInstallerProps) {
  const [modelString, setModelString] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isInstalling, setIsInstalling] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [installProgress, setInstallProgress] = useState<InstallProgress | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [models, setModels] = useState<ModelInfo[]>(POPULAR_MODELS);
  const [lastCheckedUrl, setLastCheckedUrl] = useState<string>('');
  const [checkError, setCheckError] = useState<string | null>(null);
  const { toast } = useToast();
  const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Function to check installed models and their versions with error handling
  const checkInstalledModels = async (url: string, showToast = false) => {
    // Don't check if we're already checking or installing
    if (isChecking || isInstalling) {
      return [];
    }

    // Don't recheck if the URL hasn't changed and we've already checked recently
    if (url === lastCheckedUrl && !showToast) {
      return models.filter((m) => m.installedVersion);
    }

    try {
      setIsChecking(true);
      setCheckError(null);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(`${url}/api/tags`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to fetch installed models: ${response.statusText}`);
      }

      const data = (await response.json()) as {
        models: Array<{
          name: string;
          digest: string;
          latest: string;
          size: number;
          details?: any;
        }>;
      };
      const installedModels = data.models || [];

      console.log('Installed models from Ollama:', installedModels);

      // Process installed models
      const updatedModels: ModelInfo[] = [...POPULAR_MODELS];
      const installedModelNames = new Set<string>();

      // First update existing models that match installed ones
      const updatedModelsList = updatedModels.map((model) => {
        // Try to find a direct match or a match with a version tag
        const installed = installedModels.find((m) => {
          const modelNameLower = model.name.toLowerCase();
          const installedNameLower = m.name.toLowerCase();

          /*
           * Check for exact match or if installed model starts with model name followed by a colon
           * e.g. "llama2" matches "llama2:7b"
           */
          const isMatch = installedNameLower === modelNameLower || installedNameLower.startsWith(modelNameLower + ':');

          if (isMatch) {
            installedModelNames.add(m.name.toLowerCase());
          }

          return isMatch;
        });

        if (installed) {
          // Format size for display
          const formattedSize = formatSize(installed.size);

          return {
            ...model,
            installedVersion: installed.digest.substring(0, 8),
            needsUpdate: installed.digest !== installed.latest,
            latestVersion: installed.latest?.substring(0, 8),
            size: formattedSize,
            details: installed.details,
          };
        }

        return model;
      });

      // Now add any installed models that weren't in our predefined list
      installedModels.forEach((installed) => {
        if (!installedModelNames.has(installed.name.toLowerCase())) {
          // This is a new model not in our predefined list
          const formattedSize = formatSize(installed.size);

          // Create a new model entry
          updatedModelsList.push({
            name: installed.name,
            desc: installed.details?.family
              ? `${installed.details.family} model (${installed.details.parameter_size})`
              : `Custom model`,
            size: formattedSize,
            tags: [
              installed.details?.quantization_level || 'unknown',
              installed.details?.parameter_size || 'unknown',
              ...(installed.details?.families || []),
            ],
            installedVersion: installed.digest.substring(0, 8),
            needsUpdate: installed.digest !== installed.latest,
            latestVersion: installed.latest?.substring(0, 8),
            details: installed.details,
          });

          installedModelNames.add(installed.name.toLowerCase());
        }
      });

      setModels(updatedModelsList);
      setLastCheckedUrl(url);

      if (showToast) {
        toast(`Found ${installedModels.length} installed models`);
      }

      return installedModels;
    } catch (error) {
      console.error('Error checking installed models:', error);
      setCheckError(error instanceof Error ? error.message : 'Unknown error');

      if (showToast) {
        toast('Check Failed', { type: 'error' });
      }

      return [];
    } finally {
      setIsChecking(false);
    }
  };

  // Debounced version of checkInstalledModels to prevent too many requests
  const debouncedCheckModels = useRef(
    debounce((url: string) => {
      checkInstalledModels(url, false);
    }, 1000),
  ).current;

  // Check installed models when baseUrl changes
  useEffect(() => {
    if (baseUrl) {
      // Only check models on initial mount or when baseUrl changes
      if (lastCheckedUrl !== baseUrl) {
        debouncedCheckModels(baseUrl);
      }
    }

    return () => {
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
      }
    };
  }, [baseUrl]);

  const handleCheckUpdates = async () => {
    await checkInstalledModels(baseUrl, true);
  };

  const filteredModels = models.filter((model) => {
    const matchesSearch =
      searchQuery === '' ||
      model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      model.desc.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTags = selectedTags.length === 0 || selectedTags.some((tag) => model.tags.includes(tag));

    return matchesSearch && matchesTags;
  });

  const handleInstallModel = async (modelToInstall: string) => {
    if (!modelToInstall || isInstalling) {
      return;
    }

    setIsInstalling(true);
    setInstallProgress({
      status: 'Starting installation...',
      progress: 0,
      downloadedSize: '0 B',
      totalSize: 'Calculating...',
      speed: '0 B/s',
    });

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minute timeout for large models

      const response = await fetch(`${baseUrl}/api/pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: modelToInstall }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();

      if (!reader) {
        throw new Error('Failed to get response reader');
      }

      let lastTime = Date.now();
      let lastBytes = 0;

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        const text = new TextDecoder().decode(value);
        const lines = text.split('\n').filter(Boolean);

        for (const line of lines) {
          try {
            const data = JSON.parse(line);

            if ('status' in data) {
              const currentTime = Date.now();
              const timeDiff = (currentTime - lastTime) / 1000; // Convert to seconds
              const bytesDiff = (data.completed || 0) - lastBytes;
              const speed = timeDiff > 0 ? bytesDiff / timeDiff : 0;

              setInstallProgress({
                status: data.status ? data.status.replace(/[^\x20-\x7E]/g, '') : 'Installing...',
                progress: data.completed && data.total ? (data.completed / data.total) * 100 : 0,
                downloadedSize: formatBytes(data.completed || 0),
                totalSize: data.total ? formatBytes(data.total) : 'Calculating...',
                speed: formatSpeed(speed),
              });

              lastTime = currentTime;
              lastBytes = data.completed || 0;
            }
          } catch (err) {
            console.error('Error parsing progress:', err);
          }
        }
      }

      // Keep the progress indicator visible for a moment after completion
      setInstallProgress({
        status: 'Installation complete!',
        progress: 100,
        downloadedSize: 'Complete',
        totalSize: 'Complete',
        speed: '0 B/s',
      });

      // Now that installation is successful, clear the model string and search query
      setModelString('');
      setSearchQuery('');

      toast('Model Installed');

      /*
       * Ensure we call onModelInstalled after successful installation
       * Use a small delay to ensure the server has time to register the new model
       */
      checkTimeoutRef.current = setTimeout(() => {
        // Reset the URL check to force a recheck on next render
        setLastCheckedUrl('');

        // This single call will update both the UI and the model selector
        onModelInstalled();

        // Clear the progress indicator after a delay
        setTimeout(() => {
          setInstallProgress(null);
        }, 2000);
      }, 1000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error(`Error installing ${modelToInstall}:`, errorMessage);

      toast(`Error installing model: ${errorMessage}`, { type: 'error' });

      // Show error in progress indicator
      setInstallProgress({
        status: `Error: ${errorMessage}`,
        progress: 0,
        downloadedSize: 'Failed',
        totalSize: 'Failed',
        speed: '0 B/s',
      });

      // Clear the error progress after a delay
      setTimeout(() => {
        setInstallProgress(null);
      }, 3000);
    } finally {
      setIsInstalling(false);

      // Don't clear installProgress here, we'll do it with a delay
    }
  };

  const handleUpdateModel = async (modelToUpdate: string) => {
    if (isInstalling) {
      return;
    }

    try {
      setModels((prev) => prev.map((m) => (m.name === modelToUpdate ? { ...m, status: 'updating' } : m)));

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minute timeout for large models

      const response = await fetch(`${baseUrl}/api/pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: modelToUpdate }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();

      if (!reader) {
        throw new Error('Failed to get response reader');
      }

      let lastTime = Date.now();
      let lastBytes = 0;

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        const text = new TextDecoder().decode(value);
        const lines = text.split('\n').filter(Boolean);

        for (const line of lines) {
          try {
            const data = JSON.parse(line);

            if ('status' in data) {
              const currentTime = Date.now();
              const timeDiff = (currentTime - lastTime) / 1000;
              const bytesDiff = (data.completed || 0) - lastBytes;
              const speed = bytesDiff / timeDiff;

              setInstallProgress({
                status: data.status ? data.status.replace(/[^\x20-\x7E]/g, '') : 'Installing...',
                progress: data.completed && data.total ? (data.completed / data.total) * 100 : 0,
                downloadedSize: formatBytes(data.completed || 0),
                totalSize: data.total ? formatBytes(data.total) : 'Calculating...',
                speed: formatSpeed(speed),
              });

              lastTime = currentTime;
              lastBytes = data.completed || 0;
            }
          } catch (err) {
            console.error('Error parsing progress:', err);
          }
        }
      }

      toast('Model Updated');

      // Refresh model list after update
      checkTimeoutRef.current = setTimeout(() => {
        // Reset the URL check to force a recheck
        setLastCheckedUrl('');

        // Check installed models to update the UI
        checkInstalledModels(baseUrl, false);

        // Notify parent component to refresh the model selector
        onModelInstalled();

        // Clear the progress indicator after a delay
        setTimeout(() => {
          setInstallProgress(null);
        }, 2000);
      }, 1000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error(`Error updating ${modelToUpdate}:`, errorMessage);
      toast(`Error updating model: ${errorMessage}`, { type: 'error' });
      setModels((prev) => prev.map((m) => (m.name === modelToUpdate ? { ...m, status: 'error' } : m)));
    } finally {
      setInstallProgress(null);
    }
  };

  // Add a function to handle model deletion
  const handleDeleteModel = async (modelName: string) => {
    if (isInstalling) {
      return;
    }

    try {
      // Update UI to show deletion in progress
      setModels((prev) => prev.map((m) => (m.name === modelName ? { ...m, status: 'updating' } : m)));

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      // The correct Ollama API endpoint for deleting a model
      const response = await fetch(`${baseUrl}/api/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: modelName }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Failed to delete model: ${response.statusText}`, errorText);
        throw new Error(`Failed to delete model: ${response.statusText} - ${errorText}`);
      }

      console.log(`Successfully deleted model: ${modelName}`);

      // Remove the model from the local state immediately
      setModels((prev) =>
        prev.map((m) =>
          m.name === modelName
            ? { ...m, installedVersion: undefined, needsUpdate: false, latestVersion: undefined, status: undefined }
            : m,
        ),
      );

      toast(`Model ${modelName} deleted successfully`);

      // Force a refresh of the model list
      setLastCheckedUrl(''); // Reset the URL check to force a refresh

      // First immediate refresh to update the UI
      onModelInstalled();

      /*
       * Multiple refreshes with increasing delays to ensure the model selector is updated
       * This helps overcome any caching issues
       */
      const refreshDelays = [500, 1500, 3000];
      refreshDelays.forEach((delay) => {
        setTimeout(() => {
          console.log(`Refreshing model list after ${delay}ms`);
          checkInstalledModels(baseUrl, false);
          onModelInstalled();
        }, delay);
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error(`Error deleting ${modelName}:`, errorMessage);
      toast(`Error deleting model: ${errorMessage}`, { type: 'error' });

      // Reset the model status
      setModels((prev) => prev.map((m) => (m.name === modelName ? { ...m, status: 'error' } : m)));

      // Try to reset the status after a delay
      setTimeout(() => {
        setModels((prev) => prev.map((m) => (m.name === modelName ? { ...m, status: undefined } : m)));
      }, 3000);
    }
  };

  const allTags = Array.from(new Set(POPULAR_MODELS.flatMap((model) => model.tags)));

  // Helper function to format file size
  const formatSize = (bytes: number): string => {
    if (bytes === 0) {
      return '0 B';
    }

    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));

    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Installed Models Section */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="i-ph:cube text-bolt-elements-button-primary-text text-xl" />
            <h3 className="font-medium">Installed Models</h3>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCheckUpdates}
              className={classNames('flex items-center gap-1 bg-bolt-elements-background-depth-1', {
                'opacity-50 cursor-not-allowed': isChecking || isInstalling,
              })}
              disabled={isChecking || isInstalling}
            >
              {isChecking ? (
                <div className="i-ph:spinner-gap-bold animate-spin mr-1 text-bolt-elements-textPrimary" />
              ) : (
                <span className="i-ph:arrows-clockwise mr-1 text-bolt-elements-textPrimary" />
              )}
              Refresh
            </Button>
            <span className="text-sm text-bolt-elements-textSecondary">
              {filteredModels.filter((m) => m.installedVersion).length} models available
            </span>
          </div>
        </div>

        {filteredModels.filter((m) => m.installedVersion).length === 0 ? (
          <div className="bg-bolt-elements-background-depth-2 p-6 rounded-lg border border-bolt-elements-borderColor flex flex-col items-center justify-center gap-2">
            <div className="i-ph:cube-transparent w-12 h-12 text-bolt-elements-textPrimary" />
            <p className="text-lg font-medium">No installed models</p>
            <p className="text-sm text-bolt-elements-textSecondary">Install models from the list below</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredModels
              .filter((m) => m.installedVersion)
              .map((model) => (
                <div
                  key={model.name}
                  className={classNames(
                    'bg-bolt-elements-background-depth-2 p-4 rounded-lg border border-bolt-elements-borderColor hover:border-bolt-elements-borderColorActive transition-colors',
                    {
                      'opacity-70': model.status === 'updating',
                      'border-bolt-elements-button-danger-text': model.status === 'error',
                    },
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <OllamaIcon className="w-6 h-6 text-bolt-elements-button-primary-text" />
                      <div className="flex flex-col">
                        <p className="font-medium">{model.name}</p>
                        <div className="flex items-center gap-1 text-xs text-bolt-elements-textSecondary">
                          <span>{model.installedVersion}</span>
                          <span>•</span>
                          <span>{model.size}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete ${model.name}?`)) {
                            handleDeleteModel(model.name);
                          }
                        }}
                        className="flex items-center bg-bolt-elements-background-depth-1 text-bolt-elements-button-danger-text hover:bg-bolt-elements-button-danger-backgroundHover"
                        disabled={model.status === 'updating' || isInstalling}
                      >
                        {model.status === 'updating' ? (
                          <>
                            <div className="i-ph:spinner-gap-bold animate-spin mr-1 text-bolt-elements-textPrimary" />
                            <span>Deleting...</span>
                          </>
                        ) : (
                          <>
                            <span className="i-ph:trash mr-1 text-bolt-elements-button-danger-text" />
                            <span>Delete</span>
                          </>
                        )}
                      </Button>
                      {model.needsUpdate && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateModel(model.name)}
                          className="flex items-center bg-bolt-elements-background-depth-1"
                          disabled={model.status === 'updating' || isInstalling}
                        >
                          {model.status === 'updating' ? (
                            <>
                              <div className="i-ph:spinner-gap-bold animate-spin mr-1 text-bolt-elements-textPrimary" />
                              <span>Updating...</span>
                            </>
                          ) : (
                            <>
                              <span className="i-ph:arrows-clockwise mr-1 text-bolt-elements-textPrimary" />
                              <span>Update</span>
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Ollama Models Section */}
      <div className="flex flex-col gap-4 mt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <OllamaIcon className="w-8 h-8 text-bolt-elements-button-primary-text" />
            <div>
              <h3 className="font-medium">Ollama Models</h3>
              <p className="text-sm text-bolt-elements-textSecondary">Install and manage your Ollama models</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCheckUpdates}
            className={classNames('flex items-center gap-1 bg-bolt-elements-background-depth-1', {
              'opacity-50 cursor-not-allowed': isChecking || isInstalling,
            })}
            disabled={isChecking || isInstalling}
          >
            {isChecking ? (
              <div className="i-ph:spinner-gap-bold animate-spin mr-2 text-bolt-elements-textPrimary" />
            ) : (
              <span className="i-ph:arrows-clockwise mr-2 text-bolt-elements-textPrimary" />
            )}
            Check Updates
          </Button>
        </div>

        {checkError && (
          <div className="flex items-center gap-2 p-4 bg-bolt-elements-background-depth-3 text-bolt-elements-button-danger-text rounded-lg">
            <span className="i-ph:warning-circle w-5 h-5" />
            <span>Connection error: {checkError}</span>
            <Button variant="outline" size="sm" onClick={() => checkInstalledModels(baseUrl, true)} className="ml-auto">
              Retry
            </Button>
          </div>
        )}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Input
              type="text"
              className="w-full bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary border-bolt-elements-borderColor"
              placeholder="Search models or enter custom model name..."
              value={searchQuery || modelString}
              onChange={(e) => {
                const value = e.target.value;
                setSearchQuery(value);
                setModelString(value);
              }}
              disabled={isInstalling}
            />
            <p className="text-xs text-bolt-elements-textSecondary mt-1">
              Browse models at{' '}
              <a
                href="https://ollama.com/library"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-bolt-elements-button-primary-text hover:underline"
              >
                ollama.com/library
                <span className="i-ph:arrow-square-out text-sm text-bolt-elements-button-primary-text" />
              </a>{' '}
              and copy model names to install
            </p>
          </div>
          <Button
            variant="default"
            size="default"
            onClick={() => handleInstallModel(modelString)}
            className="w-full sm:w-auto whitespace-nowrap bg-bolt-elements-button-primary-background"
            disabled={!modelString || isInstalling}
          >
            <div className="flex items-center justify-center">
              {isInstalling ? (
                <>
                  <div className="i-ph:spinner-gap-bold animate-spin w-4 h-4 mr-2 text-bolt-elements-textPrimary" />
                  <span>Installing...</span>
                </>
              ) : (
                <>
                  <span className="i-ph:download mr-2 text-bolt-elements-textPrimary" />
                  <span>Install Model</span>
                </>
              )}
            </div>
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 mt-2">
          {allTags.map((tag) => (
            <Button
              key={tag}
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
              }}
              className={classNames('text-xs', {
                'bg-bolt-elements-button-primary-background text-bolt-elements-button-primary-text':
                  selectedTags.includes(tag),
              })}
            >
              {tag}
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
          {isChecking ? (
            <div className="col-span-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-40 bg-bolt-elements-background-depth-3 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : filteredModels.filter((m) => !m.installedVersion).length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center gap-2 p-8 bg-bolt-elements-background-depth-2 rounded-lg border border-bolt-elements-borderColor">
              <div className="i-ph:cube-transparent w-12 h-12 text-bolt-elements-textPrimary" />
              <p className="text-lg font-medium">No models found matching your search</p>
              <p className="text-sm text-bolt-elements-textSecondary">Try a different search term or tag filter</p>
            </div>
          ) : (
            filteredModels
              .filter((m) => !m.installedVersion)
              .map((model) => (
                <motion.div
                  key={model.name}
                  className="bg-bolt-elements-background-depth-2 p-4 rounded-lg border border-bolt-elements-borderColor hover:border-bolt-elements-borderColorActive transition-colors"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <OllamaIcon className="w-6 h-6 text-bolt-elements-button-primary-text" />
                      <div className="flex flex-col">
                        <p className="font-medium">{model.name}</p>
                        <p className="text-sm text-bolt-elements-textSecondary">{model.desc}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className="text-xs px-2 py-0.5 bg-bolt-elements-background-depth-3 text-bolt-elements-textSecondary">
                        {model.size}
                      </span>
                      {model.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs px-2 py-0.5 bg-bolt-elements-background-depth-3 text-bolt-elements-textSecondary"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleInstallModel(model.name)}
                      className="w-full flex items-center justify-center bg-bolt-elements-background-depth-1 hover:bg-bolt-elements-button-primary-backgroundHover"
                      disabled={isInstalling}
                    >
                      <span className="i-ph:download mr-1 text-bolt-elements-textPrimary" />
                      Install
                    </Button>
                  </div>
                </motion.div>
              ))
          )}
        </div>
      </div>

      {installProgress && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-bolt-elements-background-depth-2 p-4 rounded-lg border border-bolt-elements-borderColor shadow-lg z-50"
        >
          <div className="flex flex-col mb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium truncate max-w-[70%]" title={installProgress.status}>
                {installProgress.status}
              </span>
              <span className="text-xs text-bolt-elements-textSecondary">{Math.round(installProgress.progress)}%</span>
            </div>
            <div className="flex items-center justify-between text-xs text-bolt-elements-textSecondary">
              <span>
                {installProgress.downloadedSize} / {installProgress.totalSize}
              </span>
              <span>{installProgress.speed}</span>
            </div>
          </div>
          <Progress value={installProgress.progress} className="h-2" />
        </motion.div>
      )}
    </div>
  );
}
