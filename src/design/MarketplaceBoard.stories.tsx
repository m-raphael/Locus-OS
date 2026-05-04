import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { MarketplaceBoard, type Plugin } from "./MarketplaceBoard";
import { GlassModule } from "./GlassModule";
import { LotusCanvas } from "./LotusCanvas";

const NOW = Math.floor(Date.now() / 1000);

const PLUGINS: Plugin[] = [
  {
    id: "weather",
    name: "Weather",
    version: "0.4.1",
    description: "Live conditions plus a 5-day glance, scoped to your active Space.",
    author: "Lotus Labs",
    moduleType: "WeatherModule",
    permissions: ["network"],
    isInstalled: true,
    isEnabled: true,
    rating: 4.6,
    installCount: 12_400,
    updatedAt: NOW - 86400 * 3,
  },
  {
    id: "github",
    name: "GitHub",
    version: "1.2.0",
    description: "Pull requests, issues, notifications — quietly synced into your Spaces.",
    author: "Lotus Labs",
    moduleType: "GithubModule",
    permissions: ["network", "ai_inference"],
    isInstalled: true,
    isEnabled: false,
    rating: 4.8,
    installCount: 38_900,
    updatedAt: NOW - 86400 * 12,
  },
  {
    id: "notes",
    name: "Notes",
    version: "0.7.3",
    description: "Markdown notes that mirror across Flows. Encrypted at rest.",
    author: "Lotus Labs",
    moduleType: "NotesModule",
    permissions: ["file_system"],
    rating: 4.4,
    installCount: 8_900,
    updatedAt: NOW - 86400 * 30,
  },
  {
    id: "clipboard-ai",
    name: "Clipboard AI",
    version: "0.2.0",
    description: "Summarize, translate, and reformat anything you copy. Local-first via NPU.",
    author: "Lotus Labs",
    moduleType: "ClipboardAiModule",
    permissions: ["clipboard", "ai_inference"],
    rating: 4.2,
    installCount: 21_300,
    updatedAt: NOW - 86400 * 1,
  },
  {
    id: "linear",
    name: "Linear",
    version: "0.9.0",
    description: "Linear issues piped into the active Space, with two-way edits.",
    author: "Community · @kael",
    moduleType: "Linear",
    permissions: ["network", "native_app"],
    rating: 4.0,
    installCount: 4_200,
    updatedAt: NOW - 86400 * 90,
  },
];

const meta: Meta<typeof MarketplaceBoard> = {
  title: "Design system / MarketplaceBoard",
  component: MarketplaceBoard,
  parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj<typeof MarketplaceBoard>;

function Scene({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: "relative", minHeight: "100vh", padding: 32 }}>
      <LotusCanvas />
      <div style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "center" }}>
        {children}
      </div>
    </div>
  );
}

function Inside({ children, subtitle, title }: { children: React.ReactNode; subtitle: string; title: string }) {
  return (
    <GlassModule subtitle={subtitle} title={title} width={520} minHeight={680}>
      {children}
    </GlassModule>
  );
}

// Stateful wrapper so install/uninstall reflects across the demo
function InteractiveBoard({ initial }: { initial: Plugin[] }) {
  const [plugins, setPlugins] = useState(initial);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [justInstalledId, setJustInstalledId] = useState<string | null>(null);

  const fakeAsync = (id: string, mutate: (list: Plugin[]) => Plugin[]) => {
    setBusyId(id);
    setTimeout(() => {
      setPlugins(mutate);
      setBusyId(null);
    }, 400);
  };

  return (
    <MarketplaceBoard
      plugins={plugins}
      busyId={busyId}
      justInstalledId={justInstalledId}
      onInstall={(p) => {
        fakeAsync(p.id, (list) => list.map((x) => x.id === p.id ? { ...x, isInstalled: true, isEnabled: true } : x));
        setJustInstalledId(p.id);
        setTimeout(() => setJustInstalledId(null), 800);
      }}
      onUninstall={(p) => {
        fakeAsync(p.id, (list) => list.map((x) => x.id === p.id ? { ...x, isInstalled: false, isEnabled: false } : x));
      }}
      onToggleEnabled={(p) => {
        setPlugins((list) => list.map((x) => x.id === p.id ? { ...x, isEnabled: !x.isEnabled } : x));
      }}
    />
  );
}

export const Default: Story = {
  render: () => (
    <Scene>
      <Inside subtitle="ai · ecosystem" title="Marketplace">
        <InteractiveBoard initial={PLUGINS} />
      </Inside>
    </Scene>
  ),
};

export const Empty: Story = {
  render: () => (
    <Scene>
      <Inside subtitle="ai · ecosystem" title="Marketplace">
        <MarketplaceBoard plugins={[]} />
      </Inside>
    </Scene>
  ),
};

export const AllInstalled: Story = {
  render: () => (
    <Scene>
      <Inside subtitle="ai · ecosystem" title="Marketplace">
        <MarketplaceBoard
          plugins={PLUGINS.map((p) => ({ ...p, isInstalled: true, isEnabled: true }))}
        />
      </Inside>
    </Scene>
  ),
};

export const HighRiskExpanded: Story = {
  name: "High-risk plugin (no rich metadata)",
  render: () => (
    <Scene>
      <Inside subtitle="ai · ecosystem" title="Marketplace">
        <MarketplaceBoard
          plugins={[
            {
              id: "danger",
              name: "Power tools",
              version: "0.1.0",
              description: "Read-write access to your filesystem and clipboard. Use with caution.",
              author: "Community · @anon",
              permissions: ["file_system", "clipboard", "network"],
            },
          ]}
        />
      </Inside>
    </Scene>
  ),
};
