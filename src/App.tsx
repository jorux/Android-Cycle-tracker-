import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Settings, 
  ChevronLeft, 
  Sparkles, 
  User as UserIcon, 
  Settings as SettingsIcon,
  ImagePlus,
  Trash2,
  Gift,
  CalendarClock,
  Mail,
  Camera,
  Menu,
  Moon,
  Sun,
  Paperclip,
  Link,
  ExternalLink,
  FileText,
  FileDown
} from 'lucide-react';
import { 
  format, 
  addDays, 
  differenceInDays, 
  isSameDay, 
  parseISO, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval,
  isToday,
  parse,
  setYear,
  isBefore,
  addYears
} from 'date-fns';
import { Profile, Cycle, DailyLog, Mood, Symptom, GiftIdea, ImportantDate } from './types';
import { cn } from './lib/utils';
import { getCycleInsights } from './services/geminiService';
import { dbService } from './lib/db';

const COLORS = [
  'bg-editorial-accent', 'bg-editorial-secondary', 'bg-stone-300', 
  'bg-editorial-line', 'bg-neutral-200', 'bg-stone-400'
];

const MOODS: Mood[] = ['Happy', 'Anxious', 'Irritable', 'Sad', 'Calm', 'Tired'];
const SYMPTOMS: Symptom[] = ['Cramps', 'Bloating', 'Headache', 'Back Pain', 'Acne', 'Nausea'];

export default function App() {
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [folders, setFolders] = useState<string[]>(['Uncategorized']);
  
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [isAddingProfile, setIsAddingProfile] = useState(false);
  const [isManagingFolders, setIsManagingFolders] = useState(false);
  const [isRecycleBinOpen, setIsRecycleBinOpen] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileFolder, setNewProfileFolder] = useState('');
  const [newProfileAvatar, setNewProfileAvatar] = useState<string | null>(null);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('cycle_harmony_theme') === 'dark';
  });

  useEffect(() => {
    dbService.loadData()
      .then(data => {
        if (data.profiles && data.profiles.length > 0) setProfiles(data.profiles);
        if (data.folders && data.folders.length > 0) setFolders(data.folders);
        setIsDataLoaded(true);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('cycle_harmony_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('cycle_harmony_theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    if (isDataLoaded) {
      dbService.saveData(profiles, folders).catch(console.error);
    }
  }, [profiles, folders, isDataLoaded]);

  // Recycle Bin Cleanup: Permanently remove profiles deleted > 30 days ago
  useEffect(() => {
    const now = new Date();
    const updatedProfiles = profiles.filter(p => {
      if (!p.deletedAt) return true;
      const daysSinceDeletion = differenceInDays(now, parseISO(p.deletedAt));
      return daysSinceDeletion <= 30;
    });
    
    if (updatedProfiles.length !== profiles.length) {
      setProfiles(updatedProfiles);
    }
  }, []);

  const activeProfile = profiles.find(p => p.id === activeProfileId);
  const activeProfiles = profiles.filter(p => !p.deletedAt);
  const deletedProfiles = profiles.filter(p => !!p.deletedAt);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewProfileAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const addProfile = () => {
    if (!newProfileName.trim()) return;
    const folderName = newProfileFolder.trim() || 'Uncategorized';
    
    // Ensure folder exists in our managed list
    if (!folders.includes(folderName)) {
      setFolders([...folders, folderName]);
    }

    const newProfile: Profile = {
      id: crypto.randomUUID(),
      name: newProfileName,
      folder: folderName === 'Uncategorized' ? undefined : folderName,
      avatarUrl: newProfileAvatar || undefined,
      gallery: [],
      color: COLORS[profiles.length % COLORS.length],
      averageCycleLength: 28,
      averagePeriodLength: 5,
      logs: [],
      cycles: [],
      phaseNotes: {
        'Menstrual': '',
        'Follicular': '',
        'Ovulation': '',
        'Luteal': ''
      },
      likes: [],
      dislikes: [],
      loveUser: 50,
      lovePerceived: 50,
      giftIdeasObjects: [],
      importantDates: [],
      letter: '',
      birthday: '',
      genderPreference: '',
      attachments: [],
      socialLinks: []
    };
    setProfiles([...profiles, newProfile]);
    setNewProfileName('');
    setNewProfileFolder('');
    setNewProfileAvatar(null);
    setIsAddingProfile(false);
  };

  const updateFolders = (newFolders: string[]) => {
    setFolders(newFolders);
  };

  const renameFolder = (oldName: string, newName: string) => {
    if (!newName.trim() || oldName === newName) return;
    
    setProfiles(profiles.map(p => ({
      ...p,
      folder: p.folder === oldName ? newName : p.folder
    })));
    
    setFolders(folders.map(f => f === oldName ? newName : f));
  };

  const deleteFolder = (folderName: string) => {
    if (folderName === 'Uncategorized') return;
    if (confirm(`Are you sure you want to delete the folder "${folderName}"? Profiles inside will be moved to Uncategorized.`)) {
      setProfiles(profiles.map(p => ({
        ...p,
        folder: p.folder === folderName ? undefined : p.folder
      })));
      setFolders(folders.filter(f => f !== folderName));
    }
  };

  const deleteProfile = (id: string) => {
    if (confirm('Archive this connection in the Recycle Bin? It will be permanently removed after 30 days.')) {
      setProfiles(profiles.map(p => p.id === id ? { ...p, deletedAt: new Date().toISOString() } : p));
      if (activeProfileId === id) setActiveProfileId(null);
    }
  };

  const restoreProfile = (id: string) => {
    setProfiles(profiles.map(p => p.id === id ? { ...p, deletedAt: undefined } : p));
  };

  const permanentlyDeleteProfile = (id: string) => {
    if (confirm('Permanently remove this biological archive? This action is irreversible.')) {
      setProfiles(profiles.filter(p => p.id !== id));
    }
  };

  const updateProfile = (updated: Profile) => {
    setProfiles(profiles.map(p => p.id === updated.id ? updated : p));
  };

  if (!isDataLoaded) {
    return <div className="min-h-screen bg-editorial-bg flex justify-center items-center font-serif italic text-editorial-ink/50">Accessing secure archives...</div>;
  }

  return (
    <div className="min-h-screen bg-editorial-bg text-editorial-ink font-sans flex flex-col">
      <header className="px-6 md:px-10 lg:px-16 py-8 md:py-10 flex flex-col sm:flex-row justify-between items-start sm:items-end border-b border-editorial-line gap-6 sm:gap-0">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => setActiveProfileId(null)}
            className="brand text-2xl tracking-[4px] uppercase font-light hover:text-editorial-accent transition-colors"
          >
            Cycle Circle
          </button>
        </div>
        
        <div className="flex items-center gap-8">
          <div className="date-stamp serif italic opacity-60 text-lg hidden md:block">
            {format(new Date(), 'EEEE, MMMM do')}
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}

              className="text-editorial-ink opacity-20 hover:opacity-100 hover:text-editorial-accent transition-all pb-1 mr-2"
              title={isDarkMode ? "Light Ritual" : "Dark Ritual"}
            >
              {isDarkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
            <button 
              onClick={() => setIsRecycleBinOpen(true)}
              className="text-[10px] uppercase tracking-[2px] font-bold border-b border-editorial-ink pb-1 opacity-20 hover:opacity-100 transition-all mr-4 group"
              title="Recycle Bin"
            >
              <Trash2 className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5 group-hover:text-editorial-accent transition-colors" />
              Archives ({deletedProfiles.length})
            </button>
            <button 
              onClick={() => setIsManagingFolders(true)}
              className="text-[10px] uppercase tracking-[2px] font-bold border-b border-editorial-ink pb-1 opacity-40 hover:opacity-100 hover:text-editorial-accent hover:border-editorial-accent transition-all"
            >
              Folders
            </button>
            <button 
              onClick={() => setIsAddingProfile(true)}
              className="text-[10px] uppercase tracking-[2px] font-bold border-b border-editorial-ink pb-1 hover:text-editorial-accent hover:border-editorial-accent transition-all"
            >
              Add Profile
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1400px] mx-auto w-full">
        <AnimatePresence mode="wait">
          {!activeProfileId ? (
            <Dashboard 
              profiles={activeProfiles} 
              onSelect={setActiveProfileId}
              onDelete={deleteProfile}
            />
          ) : (
            <ProfileView 
              profiles={activeProfiles}
              profile={activeProfile!} 
              onUpdate={updateProfile}
              onSelectProfile={setActiveProfileId}
            />
          )}
        </AnimatePresence>
      </main>

      {isAddingProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-editorial-ink/20 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-editorial-surface rounded-sm p-12 w-full max-w-md shadow-2xl border border-editorial-line overflow-y-auto max-h-[90vh]"
          >
            <h2 className="text-sm uppercase tracking-[3px] font-bold mb-8 opacity-50">New Connection</h2>
            <div className="space-y-8">
              <div className="flex flex-col items-center">
                <div className={cn(
                  "w-32 h-32 rounded-full mb-4 border-2 border-editorial-line flex items-center justify-center overflow-hidden bg-editorial-bg",
                  !newProfileAvatar && "border-dashed"
                )}>
                  {newProfileAvatar ? (
                    <img src={newProfileAvatar} alt="preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <UserIcon className="w-12 h-12 opacity-20" />
                  )}
                </div>
                <label className="cursor-pointer text-[10px] uppercase tracking-widest font-bold text-editorial-accent">
                  Upload Portrait
                  <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                </label>
              </div>

              <div>
                <label className="serif italic text-lg mb-2 block">Who are we tracking?</label>
                <input 
                  autoFocus
                  type="text" 
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  placeholder="name"
                  className="w-full text-2xl bg-transparent border-b border-editorial-line p-2 focus:border-editorial-accent outline-none transition-all placeholder:opacity-20"
                />
              </div>

              <div>
                <label className="serif italic text-lg mb-2 block">Assign to Folder</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={newProfileFolder}
                    onChange={(e) => setNewProfileFolder(e.target.value)}
                    placeholder="e.g. Family, Workplace"
                    className="w-full text-xl bg-transparent border-b border-editorial-line p-2 focus:border-editorial-accent outline-none transition-all placeholder:opacity-20"
                    list="existing-folders"
                  />
                  <datalist id="existing-folders">
                    {folders.map(f => (
                      <option key={f} value={f} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="flex gap-6 pt-6">
                <button 
                  onClick={() => {
                    setIsAddingProfile(false);
                    setNewProfileAvatar(null);
                    setNewProfileFolder('');
                    setNewProfileName('');
                  }}
                  className="flex-1 py-3 text-xs uppercase tracking-widest font-bold opacity-40 hover:opacity-100 transition-opacity"
                >
                  Cancel
                </button>
                <button 
                  onClick={addProfile}
                  className="flex-1 py-3 bg-editorial-accent text-white rounded-sm text-xs uppercase tracking-widest font-bold hover:bg-opacity-90 transition-all shadow-lg shadow-editorial-accent/20"
                >
                  Confirm
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {isManagingFolders && (
        <FolderManager 
          folders={folders} 
          onRename={renameFolder} 
          onDelete={deleteFolder} 
          onAdd={(name) => setFolders([...folders, name])}
          onClose={() => setIsManagingFolders(false)} 
        />
      )}

      {isRecycleBinOpen && (
        <RecycleBinModal 
          profiles={deletedProfiles}
          onRestore={restoreProfile}
          onPermanentDelete={permanentlyDeleteProfile}
          onClose={() => setIsRecycleBinOpen(false)}
        />
      )}
    </div>
  );
}

function FolderManager({ folders, onRename, onDelete, onAdd, onClose }: { 
  folders: string[], 
  onRename: (old: string, next: string) => void,
  onDelete: (name: string) => void,
  onAdd: (name: string) => void,
  onClose: () => void 
}) {
  const [newFolderName, setNewFolderName] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-editorial-ink/20 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-editorial-surface rounded-sm p-12 w-full max-w-xl shadow-2xl border border-editorial-line flex flex-col max-h-[80vh]"
      >
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-sm uppercase tracking-[3px] font-bold opacity-50">Manage Folders</h2>
          <button onClick={onClose} className="opacity-40 hover:opacity-100 p-2">
             <Plus className="w-6 h-6 rotate-45" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-6 pr-4">
          {folders.map(folder => (
            <div key={folder} className="flex items-center gap-6 p-6 border border-editorial-line group hover:border-editorial-accent transition-all">
              <input 
                type="text"
                defaultValue={folder}
                disabled={folder === 'Uncategorized'}
                onBlur={(e) => onRename(folder, e.target.value)}
                className="flex-1 bg-transparent serif text-2xl outline-none border-b border-transparent focus:border-editorial-accent disabled:opacity-40"
              />
              {folder !== 'Uncategorized' && (
                <button 
                  onClick={() => onDelete(folder)}
                  className="text-[10px] uppercase tracking-[2px] font-bold text-stone-400 hover:text-red-500 transition-colors"
                >
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="pt-8 mt-4 border-t border-editorial-line">
           <div className="flex gap-4">
              <input 
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="New folder name"
                className="flex-1 bg-transparent border-b border-editorial-line p-2 serif text-xl outline-none focus:border-editorial-accent"
              />
              <button 
                onClick={() => {
                  if (newFolderName.trim()) {
                    onAdd(newFolderName.trim());
                    setNewFolderName('');
                  }
                }}
                className="px-6 py-2 bg-editorial-ink text-white text-[10px] uppercase tracking-[2px] font-bold"
              >
                Create
              </button>
           </div>
        </div>
      </motion.div>
    </div>
  );
}

function getUpcomingDates(profiles: Profile[]) {
  const events: { title: string, profileName: string, avatarUrl?: string, color: string, nextDate: Date, daysAway: number }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  profiles.forEach(p => {
    if (p.birthday) {
      let bday = parseISO(p.birthday);
      bday.setHours(0, 0, 0, 0);
      let nextBday = setYear(bday, today.getFullYear());
      if (isBefore(nextBday, today) && !isSameDay(nextBday, today)) {
        nextBday = addYears(nextBday, 1);
      }
      const daysAway = differenceInDays(nextBday, today);
      events.push({
        title: 'Birthday',
        profileName: p.name,
        avatarUrl: p.avatarUrl,
        color: p.color,
        nextDate: nextBday,
        daysAway
      });
    }

    if (p.importantDates) {
      p.importantDates.forEach(d => {
        let date = parseISO(d.date);
        date.setHours(0, 0, 0, 0);
        if (d.isRecurring) {
          let nextDate = setYear(date, today.getFullYear());
          if (isBefore(nextDate, today) && !isSameDay(nextDate, today)) {
            nextDate = addYears(nextDate, 1);
          }
          const daysAway = differenceInDays(nextDate, today);
          events.push({
            title: d.label,
            profileName: p.name,
            avatarUrl: p.avatarUrl,
            color: p.color,
            nextDate,
            daysAway
          });
        } else {
          if (!isBefore(date, today) || isSameDay(date, today)) {
            const daysAway = differenceInDays(date, today);
            events.push({
              title: d.label,
              profileName: p.name,
              avatarUrl: p.avatarUrl,
              color: p.color,
              nextDate: date,
              daysAway
            });
          }
        }
      });
    }
  });

  return events.sort((a, b) => a.daysAway - b.daysAway).slice(0, 8);
}

function Dashboard({ profiles, onSelect, onDelete }: { 
  profiles: Profile[], 
  onSelect: (id: string) => void,
  onDelete: (id: string) => void 
}) {
  if (profiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center px-6">
        <h2 className="serif italic text-4xl mb-4">A legacy of care.</h2>
        <p className="text-editorial-ink/60 max-w-sm mb-12 font-light">
          Connected cycles create a circle of empathy. Add your first profile to begin the journey.
        </p>
        <div className="w-[1px] h-20 bg-editorial-line mb-8" />
      </div>
    );
  }

  const grouped = profiles.reduce((acc, p) => {
    const f = p.folder || 'Uncategorized';
    if (!acc[f]) acc[f] = [];
    acc[f].push(p);
    return acc;
  }, {} as Record<string, Profile[]>);

  const upcomingEvents = getUpcomingDates(profiles);

  return (
    <div className="space-y-16 py-12 px-6 md:px-0">
      {upcomingEvents.length > 0 && (
        <div className="border-t border-editorial-line pt-12">
          <div className="px-4 md:px-10 lg:px-16 mb-8">
            <h2 className="text-[12px] uppercase tracking-[4px] font-bold opacity-50 mb-2">Upcoming Important Dates</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 px-4 md:px-10 lg:px-16">
            {upcomingEvents.map((evt, i) => (
              <div key={i} className="flex gap-4 p-6 border border-editorial-line bg-editorial-surface group hover:border-editorial-accent transition-colors">
                <div className="w-16 h-16 rounded-sm border border-editorial-line flex-shrink-0 overflow-hidden transform -rotate-3 group-hover:rotate-0 transition-all">
                  {evt.avatarUrl ? (
                    <img src={evt.avatarUrl} alt={evt.profileName} className="w-full h-full object-cover grayscale group-hover:grayscale-0" referrerPolicy="no-referrer" />
                  ) : (
                    <div className={cn("w-full h-full", evt.color)} />
                  )}
                </div>
                <div>
                  <h4 className="serif text-xl mb-1">{evt.profileName}</h4>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-editorial-accent mb-2">{evt.title}</p>
                  <p className="text-xs text-editorial-ink/60">
                    {evt.daysAway === 0 ? 'Today' : evt.daysAway === 1 ? 'Tomorrow' : `In ${evt.daysAway} days`}
                    {' · '}
                    {format(evt.nextDate, 'MMM do')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {Object.entries(grouped).map(([folderName, folderProfiles]) => (
        <div key={folderName} className="border-t border-editorial-line">
          <div className="flex items-center gap-4 px-4 md:px-10 lg:px-16 -mt-[1px]">
            <span className="bg-editorial-bg px-4 py-2 border-x border-b border-editorial-line text-[10px] uppercase tracking-[3px] font-bold">
              Folder: {folderName}
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 border-l border-editorial-line mt-8">
            {folderProfiles.map(profile => {
              const lastCycle = profile.cycles[profile.cycles.length - 1];
              const isActive = lastCycle && !lastCycle.endDate;
              const daysIn = lastCycle ? differenceInDays(new Date(), parseISO(lastCycle.startDate)) : 0;
              
              return (
                <div 
                  key={profile.id}
                  onClick={() => onSelect(profile.id)}
                  className="group p-8 md:p-12 lg:p-16 border-r border-b border-editorial-line hover:bg-editorial-sidebar transition-colors cursor-pointer relative"
                >
                  <div className="mb-12 flex justify-between items-start">
                    {profile.avatarUrl ? (
                      <div className="w-24 h-24 rounded-sm border border-editorial-line overflow-hidden rotate-[-3deg] group-hover:rotate-0 transition-transform">
                        <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" referrerPolicy="no-referrer" />
                      </div>
                    ) : (
                      <div className={cn("w-12 h-12 rounded-full", profile.color)} />
                    )}
                    {isActive && (
                      <div className="w-2 h-2 rounded-full bg-editorial-accent animate-pulse" />
                    )}
                  </div>
                  
                  <span className="text-[10px] uppercase tracking-[3px] font-bold opacity-40 group-hover:opacity-100 transition-opacity mb-2 block">Profile</span>
                  <h3 className="serif text-4xl mb-6">{profile.name}</h3>
                  
                  <div className="space-y-2">
                    <p className="serif italic text-stone-400">
                      {isActive ? `Currently on day ${daysIn + 1}` : lastCycle ? `Cycle complete` : 'Gathering information'}
                    </p>
                  </div>

                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(profile.id);
                    }}
                    className="absolute top-10 right-10 opacity-0 group-hover:opacity-40 hover:!opacity-100 transition-all p-2"
                  >
                    <Plus className="w-4 h-4 rotate-45" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function ProfileView({ profiles, profile, onUpdate, onSelectProfile }: { 
  profiles: Profile[],
  profile: Profile, 
  onUpdate: (updated: Profile) => void,
  onSelectProfile: (id: string) => void
}) {
  const [activeTab, setActiveTab] = useState<'overview' | 'calendar' | 'history' | 'settings' | 'harmony'>('overview');
  const [activeHistorySubTab, setActiveHistorySubTab] = useState<'logs' | 'cycles'>('logs');
  const [insights, setInsights] = useState<{summary: string, tips: string[], phase: string} | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [isLogging, setIsLogging] = useState(false);
  const [editingLog, setEditingLog] = useState<DailyLog | null>(null);
  const [isSettingEstimates, setIsSettingEstimates] = useState(false);
  const [isAdjustingPeriod, setIsAdjustingPeriod] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  useEffect(() => {
    const fetchInsights = async () => {
      setLoadingInsights(true);
      const data = await getCycleInsights(profile);
      if (data) setInsights(data);
      setLoadingInsights(false);
    };
    fetchInsights();
  }, [profile.cycles.length, profile.logs.length, profile.id]);

  const lastCycle = profile.cycles[profile.cycles.length - 1];
  const isOnPeriod = lastCycle && !lastCycle.endDate;
  const daysInCycle = lastCycle ? differenceInDays(new Date(), parseISO(lastCycle.startDate)) : 0;

  const nextPeriodDate = useMemo(() => {
    if (profile.manualNextPeriodDate) return parseISO(profile.manualNextPeriodDate);
    if (profile.cycles.length === 0) return null;
    const lastStart = parseISO(lastCycle.startDate);
    return addDays(lastStart, profile.averageCycleLength);
  }, [profile.cycles, profile.averageCycleLength, profile.manualNextPeriodDate]);

  const ovulationDate = useMemo(() => {
    if (profile.manualOvulationDate) return parseISO(profile.manualOvulationDate);
    if (!nextPeriodDate) return null;
    // Estimated ovulation is usually 14 days before the next period
    return addDays(nextPeriodDate, -14);
  }, [nextPeriodDate, profile.manualOvulationDate]);

  const isPMS = useMemo(() => {
    if (!nextPeriodDate) return false;
    const pmsStart = addDays(nextPeriodDate, -7);
    const today = new Date();
    return today >= pmsStart && today < nextPeriodDate && !isOnPeriod;
  }, [nextPeriodDate, isOnPeriod]);

  const onPeriodUpdate = (date: string) => {
    const isoDate = new Date(date).toISOString();
    if (isOnPeriod) {
      const updatedCycles = [...profile.cycles];
      updatedCycles[updatedCycles.length - 1].endDate = isoDate;
      const sortedCycles = [...updatedCycles].sort((a, b) => a.startDate.localeCompare(b.startDate));
      onUpdate({ ...profile, cycles: sortedCycles });
    } else {
      const newCycle: Cycle = {
        id: crypto.randomUUID(),
        startDate: isoDate,
        intensity: 'Medium'
      };
      const updatedCycles = [...profile.cycles, newCycle].sort((a, b) => a.startDate.localeCompare(b.startDate));
      onUpdate({ ...profile, cycles: updatedCycles, manualNextPeriodDate: undefined, manualOvulationDate: undefined });
    }
    setIsAdjustingPeriod(false);
  };

  const addLog = (log: Omit<DailyLog, 'id'>) => {
    if (isLogging && profile.logs.length > 0 && profile.logs[0].date === log.date) {
      // If we are "editing" (implicitly if we click edit last, but let's be explicit)
      // Actually, let's just check if we want to replace the top log if it's the same day
      // But the user asked to "modify the last record".
      // Let's passed down an edit flag.
    }
    const newLog: DailyLog = { ...log, id: crypto.randomUUID() };
    onUpdate({ ...profile, logs: [newLog, ...profile.logs] });
    setIsLogging(false);
  };

  const updateLog = (log: DailyLog) => {
    onUpdate({
      ...profile,
      logs: profile.logs.map(l => l.id === log.id ? log : l)
    });
    setIsLogging(false);
  };

  const deleteLog = (id: string) => {
    onUpdate({
      ...profile,
      logs: profile.logs.filter(l => l.id !== id)
    });
  };

  const deleteCycle = (id: string) => {
    onUpdate({
      ...profile,
      cycles: profile.cycles.filter(c => c.id !== id)
    });
  };

  const groupedProfiles = useMemo(() => {
    return profiles.reduce((acc, p) => {
      const f = p.folder || 'Uncategorized';
      if (!acc[f]) acc[f] = [];
      acc[f].push(p);
      return acc;
    }, {} as Record<string, Profile[]>);
  }, [profiles]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_300px] min-h-[calc(100vh-140px)] relative">
      {/* Mobile Profile Trigger */}
      <div className="lg:hidden sticky top-0 z-40 bg-editorial-bg border-b border-editorial-line px-6 py-4 flex justify-between items-center">
        <button 
          onClick={() => setIsMobileNavOpen(true)}
          className="flex items-center gap-3 text-[10px] uppercase tracking-[2px] font-bold"
        >
          <Menu className="w-5 h-5 text-editorial-accent" />
          Profiles
        </button>
        <span className="serif italic text-lg opacity-40">{profile.name}</span>
      </div>

      {/* Folders Sidebar - Responsive Overlay */}
      <section className={cn(
        "fixed inset-0 lg:relative z-50 lg:z-0 lg:block lg:border-r lg:border-editorial-line bg-editorial-bg transition-transform duration-500",
        isMobileNavOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        "px-10 py-12 overflow-y-auto lg:h-auto"
      )}>
        <div className="flex justify-between items-center mb-8 lg:block">
          <h2 className="text-[11px] uppercase tracking-[2.5px] font-bold opacity-30">Folders</h2>
          <button onClick={() => setIsMobileNavOpen(false)} className="lg:hidden p-2 opacity-40">
            <Plus className="w-6 h-6 rotate-45" />
          </button>
        </div>
        
        <div className="space-y-12">
          {Object.entries(groupedProfiles).map(([folderName, folderProfiles]) => (
            <div key={folderName}>
              <h3 className="text-[9px] uppercase tracking-[3px] font-black mb-4 opacity-40 border-b border-editorial-line pb-2">{folderName}</h3>
              <ul className="space-y-1">
                {(folderProfiles as Profile[]).map(p => (
                  <li 
                    key={p.id}
                    onClick={() => {
                      onSelectProfile(p.id);
                      setIsMobileNavOpen(false);
                    }}
                    className={cn(
                      "py-4 cursor-pointer flex items-center gap-4 transition-all group",
                      p.id === profile.id ? "opacity-100" : "opacity-40 hover:opacity-70"
                    )}
                  >
                    {p.avatarUrl ? (
                      <div className="w-10 h-10 rounded-sm border border-editorial-line overflow-hidden rotate-[-2deg] group-hover:rotate-0 transition-transform">
                        <img src={p.avatarUrl} alt={p.name} className="w-full h-full object-cover grayscale" referrerPolicy="no-referrer" />
                      </div>
                    ) : (
                      <div className={cn("w-8 h-8 rounded-full flex-shrink-0", p.color)} />
                    )}
                    <div>
                      <div className="font-bold text-sm tracking-tight">{p.name}</div>
                      <div className="text-[10px] opacity-60 uppercase tracking-widest">{p.logs[0]?.moods[0] || 'Calm'}</div>
                    </div>
                    {p.id === profile.id && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-editorial-accent" />}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        
        <div className="mt-16 pt-16 border-t border-editorial-line hidden lg:block">
          <span className="text-[10px] uppercase tracking-[2px] font-bold opacity-40 mb-4 block">Next Alert</span>
          <p className="text-sm leading-relaxed serif italic opacity-70">
            {nextPeriodDate ? `Predicted start in ${differenceInDays(nextPeriodDate, new Date())} days.` : 'Collecting more data for precision.'}
          </p>
        </div>
      </section>

      <section className="px-6 md:px-10 lg:px-16 py-12 lg:py-20 flex flex-col h-full bg-editorial-surface lg:bg-transparent overflow-y-auto">
        <div className="flex items-start justify-between mb-8 sm:mb-12">
          <div className="serif italic text-xl sm:text-2xl text-editorial-secondary flex flex-wrap items-center gap-x-4">
            {profile.name}
            {profile.genderPreference && (
              <span className="text-[10px] font-bold uppercase tracking-[3px] opacity-40 translate-y-1">({profile.genderPreference})</span>
            )}
            <span className="opacity-60">is on day</span>
          </div>
          {profile.avatarUrl ? (
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-sm border border-editorial-line overflow-hidden rotate-[4deg] shadow-lg shadow-editorial-ink/5 flex-shrink-0">
               <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
          ) : (
            <div className={cn("w-16 h-16 sm:w-20 sm:h-20 rounded-sm border border-editorial-line rotate-[4deg] shadow-lg shadow-editorial-ink/5 flex-shrink-0 flex items-center justify-center text-white text-3xl font-light serif italic", profile.color)}>
              {profile.name.charAt(0)}
            </div>
          )}
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-baseline gap-8 sm:gap-6 mb-12">
          <h1 className="cycle-count serif text-[80px] sm:text-[140px] leading-[0.8] font-light">
            {daysInCycle + 1}
          </h1>
          <div className="flex flex-wrap sm:flex-col gap-3 sm:gap-2 w-full sm:w-auto">
            <button 
              onClick={() => setIsAdjustingPeriod(true)}
              className="flex-1 sm:flex-none px-6 py-3 border border-editorial-secondary rounded-full text-[10px] uppercase tracking-[2px] font-bold hover:bg-editorial-secondary hover:text-white transition-all whitespace-nowrap"
            >
              {isOnPeriod ? 'End Cycle' : 'Start Period'}
            </button>
            <div className="flex gap-2 w-full sm:w-auto">
              <button 
                onClick={() => {
                  setEditingLog(null);
                  setIsLogging(true);
                }}
                className="flex-1 px-6 py-3 bg-editorial-accent border border-editorial-accent text-white rounded-full text-[10px] uppercase tracking-[2px] font-bold hover:opacity-90 transition-all shadow-sm whitespace-nowrap"
              >
                Log Record
              </button>
              {profile.logs.length > 0 && (
                <button 
                  onClick={() => {
                    setEditingLog(profile.logs[0]);
                    setIsLogging(true);
                  }}
                  className="px-4 py-3 border border-editorial-line text-editorial-ink rounded-full text-[10px] uppercase tracking-[2px] font-bold hover:bg-stone-100 transition-all opacity-60 italic serif"
                >
                  Edit Last
                </button>
              )}
            </div>
            <button 
              onClick={() => setIsSettingEstimates(true)}
              className="flex-1 sm:flex-none px-6 py-3 border border-editorial-line text-editorial-secondary rounded-full text-[10px] uppercase tracking-[2px] font-bold hover:bg-stone-100 transition-all opacity-60 hover:opacity-100 italic serif whitespace-nowrap"
            >
              Set Projections
            </button>
          </div>
        </div>

        <div className="phase-info border-l-[3px] border-editorial-accent pl-8 mb-12">
          <div className="flex items-baseline gap-4 mb-4">
            <h3 className="text-4xl font-light text-editorial-secondary italic serif">
              {isOnPeriod ? 'Menstrual Phase' : isPMS ? 'Luteal Phase (PMS)' : insights?.phase || 'Cycle Harmony'}
            </h3>
            {profile.birthday && (
              <span className="text-[10px] font-bold uppercase tracking-[2px] opacity-40 text-stone-400">
                • Born {format(parse(profile.birthday.split('T')[0], 'yyyy-MM-dd', new Date()), 'MMMM do')}
              </span>
            )}
          </div>
          <div className="flex flex-col gap-1 mb-6">
            <p className="text-editorial-ink/60 leading-relaxed text-lg max-w-md serif italic">
              {insights?.summary || 'Gathering biological patterns. Log symptoms to unlock personalized phase descriptions.'}
            </p>
            {ovulationDate && (
              <div className="text-xs uppercase tracking-[2px] font-bold text-editorial-accent mt-4">
                Estimated Ovulation: {format(ovulationDate, 'MMMM do')}
                {profile.manualOvulationDate && <span className="ml-2 font-light opacity-50">(Manual)</span>}
              </div>
            )}
            {nextPeriodDate && (
              <div className="text-xs uppercase tracking-[2px] font-bold text-editorial-secondary">
                Next Bleeding: {format(nextPeriodDate, 'MMMM do')}
                {profile.manualNextPeriodDate && <span className="ml-2 font-light opacity-50">(Manual)</span>}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {profile.logs[0]?.symptoms.map(s => (
              <span key={s} className="px-4 py-1.5 border border-editorial-line rounded-full text-[11px] font-medium tracking-tight">
                {s}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-auto pt-12 flex gap-1 md:gap-2 items-end h-[80px] sm:h-[140px] overflow-hidden">
          {Array.from({ length: profile.averageCycleLength }).map((_, i) => {
            const isTodayIndex = i === daysInCycle;
            const isCompleted = i < daysInCycle;
            const isPredicted = i > daysInCycle && i < (daysInCycle + 5);
            const isOvulation = ovulationDate && i === differenceInDays(ovulationDate, lastCycle ? parseISO(lastCycle.startDate) : new Date());
            
            return (
              <div 
                key={i}
                className={cn(
                  "flex-1 rounded-full transition-all duration-500 min-w-[2px]",
                  isTodayIndex ? "h-full bg-editorial-accent shadow-lg shadow-editorial-accent/20" : 
                  isOvulation ? "h-[85%] bg-editorial-accent opacity-60 border-2 border-editorial-accent ring-4 ring-editorial-accent/10" :
                  isCompleted ? "h-[60%] bg-editorial-secondary opacity-20" : 
                  isPredicted ? "h-[40%] border border-dashed border-editorial-accent opacity-40" : 
                  "h-[30%] bg-editorial-line"
                )}
              />
            );
          })}
        </div>
      </section>

      <section className="bg-editorial-sidebar p-6 md:p-10 flex flex-col gap-8 md:gap-12 lg:border-l lg:border-editorial-line overflow-y-auto">
        <div className="insight-card">
          <span className="text-[10px] font-bold uppercase tracking-[2px] opacity-40 mb-4 block">Care Insight</span>
          {loadingInsights ? (
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-editorial-ink/10 w-full" />
              <div className="h-4 bg-editorial-ink/10 w-3/4" />
            </div>
          ) : (
            <p className="serif text-xl leading-snug">
              {insights?.tips[0] || 'No specific insights today. Keep logging to improve precision.'}
            </p>
          )}
        </div>

        <div className="action-item bg-editorial-surface p-8 rounded-sm shadow-xl shadow-editorial-ink/5">
          <span className="text-editorial-accent text-[10px] font-black uppercase tracking-[2px] mb-4 block">The Care List</span>
          <div className="text-sm font-bold tracking-tight mb-4 border-b border-editorial-line pb-2">PREPARATION</div>
          <ul className="space-y-4 text-xs font-medium text-editorial-ink/70 serif italic leading-relaxed">
            {insights?.tips && insights.tips.slice(1).map((tip, i) => (
              <li key={i} className="flex gap-3">
                <span className="text-editorial-accent">•</span>
                {tip}
              </li>
            ))}
            {(!insights?.tips || insights.tips.length <= 1) && <li>Add records to generate a care plan.</li>}
          </ul>
        </div>

        <div className="insight-card bg-editorial-accent/5 p-6 rounded-sm border border-editorial-accent/10 cursor-pointer group hover:bg-editorial-accent/10 transition-all shadow-sm" onClick={() => setActiveTab('harmony')}>
          <span className="text-[10px] font-bold uppercase tracking-[2px] text-editorial-accent mb-4 block">Harmony & Connection</span>
          <div className="flex gap-4 mb-4">
             <div className="flex-1">
                <div className="text-[9px] uppercase tracking-tighter opacity-40">Your Devotion</div>
                <div className="serif italic text-xl">{profile.loveUser || 50}%</div>
             </div>
             <div className="flex-1 border-stone-200 pl-4 border-l">
                <div className="text-[9px] uppercase tracking-tighter opacity-40">Perceived</div>
                <div className="serif italic text-xl">{profile.lovePerceived || 50}%</div>
             </div>
          </div>
          <p className="text-[10px] serif italic opacity-60 line-clamp-2 leading-relaxed">
             {profile.likes?.length ? `Enjoys ${profile.likes[0]}. ` : ''}
             {profile.giftIdeasObjects?.length ? `Gift idea: ${profile.giftIdeasObjects[0].name}.` : 'Define custom care nuances.'}
          </p>
        </div>

        {profile.socialLinks && profile.socialLinks.length > 0 && (
          <div className="bg-editorial-sidebar/30 p-6 rounded-sm border border-editorial-line">
            <span className="text-[10px] font-bold uppercase tracking-[2px] opacity-40 mb-4 block">Manifest Socials</span>
            <div className="flex flex-wrap gap-4">
              {profile.socialLinks.map(link => (
                <a 
                  key={link.id} 
                  href={link.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex items-center gap-2 text-xs opacity-60 hover:opacity-100 hover:text-editorial-accent transition-all"
                  title={link.url}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="serif italic">{link.platform}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {profile.attachments && profile.attachments.length > 0 && (
          <div className="bg-editorial-surface p-6 rounded-sm border border-editorial-line shadow-sm">
             <span className="text-[10px] font-bold uppercase tracking-[2px] opacity-40 mb-4 block">Archive Attachments</span>
             <div className="space-y-4">
               {profile.attachments.slice(0, 3).map(file => (
                 <a 
                  key={file.id} 
                  href={file.url} 
                  download={file.name}
                  className="flex items-center gap-3 group"
                 >
                   <div className="w-8 h-8 bg-editorial-sidebar flex items-center justify-center shrink-0">
                     {file.type.includes('image') ? <Camera className="w-4 h-4 opacity-30" /> : <FileText className="w-4 h-4 opacity-30" />}
                   </div>
                   <div className="overflow-hidden">
                     <p className="text-[10px] font-bold truncate group-hover:text-editorial-accent transition-colors">{file.name}</p>
                     <p className="text-[8px] uppercase tracking-tighter opacity-30">{format(parseISO(file.date), 'MMM d')}</p>
                   </div>
                 </a>
               ))}
               {profile.attachments.length > 3 && (
                 <button onClick={() => setActiveTab('settings')} className="text-[9px] uppercase tracking-widest font-black opacity-30 hover:opacity-100 underline decoration-editorial-accent/20">
                   View all {profile.attachments.length} files
                 </button>
               )}
             </div>
          </div>
        )}

        <div className="mt-auto border-t border-editorial-line pt-8 flex justify-between items-center cursor-pointer group" onClick={() => setActiveTab('settings')}>
           <div>
            <span className="text-[10px] font-bold uppercase tracking-[2px] opacity-40 mb-2 block">Settings</span>
            <span className="serif text-2xl group-hover:text-editorial-accent transition-colors">Configuration</span>
           </div>
           <SettingsIcon className="w-6 h-6 opacity-20 group-hover:opacity-100 transition-opacity" />
        </div>

        <div className="insight-card">
          <span className="text-[10px] font-bold uppercase tracking-[2px] opacity-40 mb-4 block">Current Mood</span>
          <p className="serif text-4xl">
            {profile.logs[0]?.moods[0] || 'Centred'}
          </p>
        </div>
      </section>

      {activeTab !== 'overview' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-8 bg-editorial-ink/40 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-editorial-bg w-full max-w-4xl h-full sm:h-[80vh] sm:rounded-sm overflow-hidden flex flex-col shadow-2xl"
          >
            <div className="p-6 sm:p-10 border-b border-editorial-line flex justify-between items-center shrink-0">
              <div className="flex items-center gap-6 overflow-hidden">
                {profile.avatarUrl ? (
                  <div className="w-10 h-10 rounded-sm border border-editorial-line overflow-hidden shrink-0 hidden sm:block">
                    <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                ) : (
                  <div className={cn("w-10 h-10 rounded-sm border border-editorial-line shrink-0 hidden sm:block flex items-center justify-center text-white text-lg serif italic", profile.color)}>
                    {profile.name.charAt(0)}
                  </div>
                )}
                <div className="flex gap-4 sm:gap-8 overflow-x-auto no-scrollbar pb-1">
                  {['calendar', 'harmony', 'history', 'settings'].map(t => (
                    <button 
                      key={t}
                      onClick={() => setActiveTab(t as any)}
                      className={cn(
                        "text-[10px] uppercase tracking-[3px] font-bold transition-all whitespace-nowrap",
                        activeTab === t ? "text-editorial-accent" : "opacity-30 hover:opacity-100"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <button 
                onClick={() => setActiveTab('overview')}
                className="opacity-30 hover:opacity-100 transition-all font-light text-2xl sm:text-3xl ml-4"
              >
                ×
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 sm:p-12">
              {activeTab === 'calendar' && <CycleCalendar profile={profile} />}
              {activeTab === 'history' && (
                <div className="space-y-12">
                  <div className="flex gap-8 border-b border-editorial-line pb-4">
                    <button 
                      onClick={() => setActiveHistorySubTab('logs')}
                      className={cn(
                        "text-[10px] uppercase tracking-[2px] font-bold",
                        activeHistorySubTab === 'logs' ? "text-editorial-ink" : "opacity-30"
                      )}
                    >
                      Narratives
                    </button>
                    <button 
                      onClick={() => setActiveHistorySubTab('cycles')}
                      className={cn(
                        "text-[10px] uppercase tracking-[2px] font-bold",
                        activeHistorySubTab === 'cycles' ? "text-editorial-ink" : "opacity-30"
                      )}
                    >
                      Archives
                    </button>
                  </div>
                  
                  {activeHistorySubTab === 'logs' ? (
                    <LogsList 
                      logs={profile.logs} 
                      onEdit={(log) => {
                        setEditingLog(log);
                        setIsLogging(true);
                      }}
                      onDelete={deleteLog}
                    />
                  ) : (
                    <CyclesList 
                      cycles={profile.cycles} 
                      onDelete={deleteCycle}
                      onUpdateCycle={(updatedCycle) => {
                        onUpdate({
                          ...profile,
                          cycles: profile.cycles.map(c => c.id === updatedCycle.id ? updatedCycle : c)
                        });
                      }}
                    />
                  )}
                </div>
              )}
              {activeTab === 'harmony' && (
                <div className="space-y-20 pb-20 max-w-4xl">
                  <header>
                    <h4 className="serif text-4xl italic mb-4">The Harmony Index.</h4>
                    <p className="text-stone-400 text-sm italic serif">Understanding the nuances of connection and documentation of care.</p>
                  </header>

                  {/* Identity Gallery */}
                  <section className="space-y-8">
                    <div className="flex justify-between items-baseline border-b border-editorial-line pb-4">
                      <label className="text-[10px] font-bold uppercase tracking-[3px] text-editorial-accent">Portrait Gallery</label>
                      <label className="cursor-pointer group flex items-center gap-2 text-[9px] uppercase tracking-widest font-black opacity-40 hover:opacity-100 transition-opacity">
                        <Camera className="w-3 h-3" />
                        Capture Nuance
                        <input 
                          type="file" 
                          multiple 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []) as File[];
                            files.forEach(file => {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                onUpdate({ ...profile, gallery: [...(profile.gallery || []), reader.result as string] });
                              };
                              reader.readAsDataURL(file);
                            });
                          }}
                        />
                      </label>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {profile.gallery?.map((url, idx) => (
                        <div key={idx} className="aspect-square relative group overflow-hidden border border-editorial-line bg-stone-50">
                          <img src={url} alt={`Gallery ${idx}`} className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700" referrerPolicy="no-referrer" />
                          <button 
                            onClick={() => onUpdate({ ...profile, gallery: profile.gallery?.filter((_, i) => i !== idx) })}
                            className="absolute top-2 right-2 p-1.5 bg-editorial-surface/90 backdrop-blur rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-editorial-surface"
                          >
                            <Trash2 className="w-3 h-3 text-red-400" />
                          </button>
                        </div>
                      ))}
                      {(!profile.gallery || profile.gallery.length === 0) && (
                        <div className="col-span-full py-12 border-2 border-dashed border-editorial-line flex flex-col items-center justify-center gap-4 opacity-30">
                          <ImagePlus className="w-6 h-6" />
                          <span className="text-[9px] uppercase tracking-[2px] font-black">No ritual captures yet</span>
                        </div>
                      )}
                    </div>
                  </section>

                  {/* Love Meters */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-8 border-t border-editorial-line">
                     <div className="space-y-4">
                        <label className="text-[10px] font-bold uppercase tracking-[2px] opacity-40 block">Your Devotion</label>
                        <div className="flex items-center gap-4">
                           <input 
                              type="range" 
                              min="0" max="100" 
                              value={profile.loveUser || 50} 
                              onChange={(e) => onUpdate({ ...profile, loveUser: parseInt(e.target.value) })}
                              className="flex-1 accent-editorial-accent"
                           />
                           <span className="serif italic text-xl w-8">{profile.loveUser || 50}%</span>
                        </div>
                        <p className="text-[9px] opacity-40 uppercase tracking-widest italic">Intensity of care directed inward or outward.</p>
                     </div>
                     <div className="space-y-4">
                        <label className="text-[10px] font-bold uppercase tracking-[2px] opacity-40 block">Perceived Connection</label>
                        <div className="flex items-center gap-4">
                           <input 
                              type="range" 
                              min="0" max="100" 
                              value={profile.lovePerceived || 50} 
                              onChange={(e) => onUpdate({ ...profile, lovePerceived: parseInt(e.target.value) })}
                              className="flex-1 accent-editorial-secondary"
                           />
                           <span className="serif italic text-xl w-8">{profile.lovePerceived || 50}%</span>
                        </div>
                        <p className="text-[9px] opacity-40 uppercase tracking-widest italic">A gauge of reciprocal resonance.</p>
                     </div>
                  </div>

                  {/* General Likes/Dislikes */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-8 border-t border-editorial-line">
                     <div className="space-y-4">
                        <label className="text-[10px] font-bold uppercase tracking-[2px] opacity-40 block">General Affinities</label>
                        <textarea 
                           value={profile.likes?.join(', ') || ''}
                           onChange={(e) => onUpdate({ ...profile, likes: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                           placeholder="Loves mint, morning walks, the scent of rain..."
                           className="w-full bg-stone-50 border border-editorial-line p-5 serif italic outline-none focus:border-editorial-accent min-h-[120px] text-sm leading-relaxed"
                        />
                     </div>
                     <div className="space-y-4">
                        <label className="text-[10px] font-bold uppercase tracking-[2px] opacity-40 block">Aversions</label>
                        <textarea 
                           value={profile.dislikes?.join(', ') || ''}
                           onChange={(e) => onUpdate({ ...profile, dislikes: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                           placeholder="Hates mayo, loud noise, unannounced visits..."
                           className="w-full bg-stone-50 border border-editorial-line p-5 serif italic outline-none focus:border-editorial-accent min-h-[120px] text-sm leading-relaxed"
                        />
                     </div>
                  </div>

                  {/* Important Dates */}
                  <section className="space-y-8 pt-8 border-t border-editorial-line">
                    <div className="flex justify-between items-baseline">
                      <label className="text-[10px] font-bold uppercase tracking-[3px] text-editorial-accent">Chronology of Significance</label>
                      <button 
                        onClick={() => {
                          const newDate: ImportantDate = {
                            id: crypto.randomUUID(),
                            label: 'New Occasion',
                            date: new Date().toISOString(),
                            isRecurring: true,
                            notes: ''
                          };
                          onUpdate({ ...profile, importantDates: [...(profile.importantDates || []), newDate] });
                        }}
                        className="text-[9px] uppercase tracking-widest font-black opacity-40 hover:opacity-100 transition-opacity flex items-center gap-2"
                      >
                        <Plus className="w-3 h-3" /> Mark Calendar
                      </button>
                    </div>
                    <div className="space-y-4">
                      {profile.importantDates?.map((d, idx) => (
                        <div key={d.id} className="p-6 border border-editorial-line bg-editorial-surface shadow-sm flex flex-col md:flex-row gap-6 group relative">
                          <button 
                            onClick={() => onUpdate({ ...profile, importantDates: profile.importantDates?.filter(i => i.id !== d.id) })}
                            className="absolute top-4 right-4 p-1.5 opacity-0 group-hover:opacity-40 hover:opacity-100 transition-all"
                          >
                            <Trash2 className="w-4 h-4 text-red-300" />
                          </button>
                          
                          <div className="flex flex-col gap-3 shrink-0">
                            <input 
                              type="text" 
                              value={d.label}
                              onChange={(e) => onUpdate({ 
                                ...profile, 
                                importantDates: profile.importantDates?.map(id => id.id === d.id ? { ...id, label: e.target.value } : id)
                              })}
                              className="serif italic font-bold text-lg outline-none border-b border-transparent focus:border-editorial-accent pb-1 w-40"
                              placeholder="Label"
                            />
                            <input 
                              type="date" 
                              value={d.date.split('T')[0]}
                              onChange={(e) => onUpdate({ 
                                ...profile, 
                                importantDates: profile.importantDates?.map(id => id.id === d.id ? { ...id, date: e.target.value } : id)
                              })}
                              className="text-xs uppercase tracking-[2px] opacity-40 outline-none hover:opacity-100 transition-opacity bg-transparent"
                            />
                            <label className="flex items-center gap-2 cursor-pointer mt-2">
                              <input 
                                type="checkbox" 
                                checked={d.isRecurring}
                                onChange={(e) => onUpdate({ 
                                  ...profile, 
                                  importantDates: profile.importantDates?.map(id => id.id === d.id ? { ...id, isRecurring: e.target.checked } : id)
                                })}
                                className="accent-editorial-accent rounded-sm"
                              />
                              <span className="text-[9px] uppercase tracking-widest opacity-60">Recurring Event</span>
                            </label>
                          </div>
                          
                          <div className="flex-1 flex flex-col gap-3">
                             <textarea 
                                value={d.notes}
                                onChange={(e) => onUpdate({ 
                                  ...profile, 
                                  importantDates: profile.importantDates?.map(id => id.id === d.id ? { ...id, notes: e.target.value } : id)
                                })}
                                placeholder="Add specific details or ritual notes for this date..."
                                className="w-full bg-stone-50 border border-editorial-line p-3 text-xs serif italic min-h-[80px] outline-none focus:border-editorial-accent"
                             />
                             <div className="flex flex-wrap gap-2">
                                {d.images?.map((img, i) => (
                                  <div key={i} className="w-16 h-16 border border-editorial-line relative group/img cursor-pointer transition-transform hover:scale-110">
                                    <img src={img} className="w-full h-full object-cover grayscale" referrerPolicy="no-referrer" />
                                    <button 
                                      onClick={() => onUpdate({ 
                                        ...profile, 
                                        importantDates: profile.importantDates?.map(id => id.id === d.id ? { ...id, images: id.images?.filter((_, imIdx) => imIdx !== i) } : id)
                                      })}
                                      className="absolute top-0 right-0 p-0.5 bg-editorial-surface/90 opacity-0 group-hover/img:opacity-100"
                                    >
                                      <Trash2 className="w-2 h-2 text-red-400" />
                                    </button>
                                  </div>
                                ))}
                                <label className="w-16 h-16 border-2 border-dashed border-editorial-line flex items-center justify-center cursor-pointer opacity-30 hover:opacity-100 transition-all">
                                  <ImagePlus className="w-4 h-4" />
                                  <input 
                                    type="file" 
                                    accept="image/*" 
                                    className="hidden" 
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        const reader = new FileReader();
                                        reader.onloadend = () => {
                                          onUpdate({ 
                                            ...profile, 
                                            importantDates: profile.importantDates?.map(id => id.id === d.id ? { ...id, images: [...(id.images || []), reader.result as string] } : id)
                                          });
                                        };
                                        reader.readAsDataURL(file);
                                      }
                                    }}
                                  />
                                </label>
                             </div>
                          </div>
                        </div>
                      ))}
                      {(!profile.importantDates || profile.importantDates.length === 0) && (
                         <div className="p-8 border-2 border-dashed border-editorial-line text-center opacity-30 serif italic text-sm">
                            Document recurring celebrations to ensure timely devotion.
                         </div>
                      )}
                    </div>
                  </section>

                  {/* Gift Dossier */}
                  <section className="space-y-8 pt-8 border-t border-editorial-line">
                    <div className="flex justify-between items-baseline">
                      <label className="text-[10px] font-bold uppercase tracking-[3px] text-editorial-accent">Gift Protocol & Desires</label>
                      <button 
                        onClick={() => {
                          const newGift: GiftIdea = {
                            id: crypto.randomUUID(),
                            name: 'Prospective Gift',
                            notes: '',
                            images: []
                          };
                          onUpdate({ ...profile, giftIdeasObjects: [...(profile.giftIdeasObjects || []), newGift] });
                        }}
                        className="text-[9px] uppercase tracking-widest font-black opacity-40 hover:opacity-100 transition-opacity flex items-center gap-2"
                      >
                        <Plus className="w-3 h-3" /> Archive Desired Object
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {profile.giftIdeasObjects?.map((g) => (
                        <div key={g.id} className="p-6 border border-editorial-line bg-editorial-surface shadow-pill relative group">
                          <button 
                            onClick={() => onUpdate({ ...profile, giftIdeasObjects: profile.giftIdeasObjects?.filter(i => i.id !== g.id) })}
                            className="absolute top-4 right-4 p-1 opacity-0 group-hover:opacity-40 hover:opacity-100 transition-all"
                          >
                            <Trash2 className="w-3 h-3 text-red-300" />
                          </button>
                          
                          <div className="flex gap-4">
                             <div className="shrink-0">
                                {g.images && g.images.length > 0 ? (
                                  <div className="w-20 h-20 border border-editorial-line relative group/img overflow-hidden">
                                    <img src={g.images[0]} className="w-full h-full object-cover grayscale transition-transform duration-700 hover:scale-110" referrerPolicy="no-referrer" />
                                    <label className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity cursor-pointer">
                                       <Camera className="w-4 h-4 text-white" />
                                       <input 
                                         type="file" 
                                         accept="image/*" 
                                         multiple
                                         className="hidden" 
                                         onChange={(e) => {
                                           const files = Array.from(e.target.files || []) as File[];
                                           files.forEach(file => {
                                             const reader = new FileReader();
                                             reader.onloadend = () => {
                                               onUpdate({ 
                                                 ...profile, 
                                                 giftIdeasObjects: profile.giftIdeasObjects?.map(gi => gi.id === g.id ? { ...gi, images: [...(gi.images || []), reader.result as string] } : gi)
                                               });
                                             };
                                             reader.readAsDataURL(file);
                                           });
                                         }}
                                       />
                                    </label>
                                  </div>
                                ) : (
                                  <label className="w-20 h-20 border border-editorial-line flex items-center justify-center cursor-pointer bg-stone-50 hover:bg-stone-100 transition-colors">
                                    <ImagePlus className="w-5 h-5 opacity-20" />
                                    <input 
                                      type="file" 
                                      accept="image/*" 
                                      className="hidden" 
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          const reader = new FileReader();
                                          reader.onloadend = () => {
                                            onUpdate({ 
                                              ...profile, 
                                              giftIdeasObjects: profile.giftIdeasObjects?.map(gi => gi.id === g.id ? { ...gi, images: [...(gi.images || []), reader.result as string] } : gi)
                                            });
                                          };
                                          reader.readAsDataURL(file);
                                        }
                                      }}
                                    />
                                  </label>
                                )}
                             </div>
                             <div className="flex-1 space-y-2">
                                <input 
                                  value={g.name}
                                  onChange={(e) => onUpdate({ ...profile, giftIdeasObjects: profile.giftIdeasObjects?.map(gi => gi.id === g.id ? { ...gi, name: e.target.value } : gi) })}
                                  placeholder="Gift Item Name"
                                  className="w-full bg-transparent serif italic font-bold border-b border-transparent focus:border-editorial-accent outline-none"
                                />
                                <textarea 
                                  value={g.notes}
                                  onChange={(e) => onUpdate({ ...profile, giftIdeasObjects: profile.giftIdeasObjects?.map(gi => gi.id === g.id ? { ...gi, notes: e.target.value } : gi) })}
                                  placeholder="Notes on size, color, or source..."
                                  className="w-full bg-transparent text-[11px] serif italic leading-relaxed min-h-[60px] outline-none"
                                />
                             </div>
                          </div>
                          {g.images && g.images.length > 1 && (
                            <div className="mt-4 flex flex-wrap gap-2">
                               {g.images.slice(1).map((img, i) => (
                                 <div key={i} className="w-8 h-8 border border-editorial-line relative group/thumb">
                                    <img src={img} className="w-full h-full object-cover grayscale" referrerPolicy="no-referrer" />
                                    <button 
                                      onClick={() => onUpdate({ 
                                        ...profile, 
                                        giftIdeasObjects: profile.giftIdeasObjects?.map(gi => gi.id === g.id ? { ...gi, images: gi.images?.filter((_, idx) => idx !== (i + 1)) } : gi)
                                      })}
                                      className="absolute inset-0 bg-editorial-surface/60 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity"
                                    >
                                      <Trash2 className="w-2 h-2 text-red-500" />
                                    </button>
                                 </div>
                               ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Phase Specific Notes */}
                  <div className="space-y-8 pt-8 border-t border-editorial-line">
                     <label className="text-[10px] font-bold uppercase tracking-[3px] text-editorial-accent underline underline-offset-8">Phase-Specific Nuances</label>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                        {['Menstrual', 'Follicular', 'Ovulation', 'Luteal'].map(p => (
                           <div key={p} className="space-y-3">
                              <span className="serif italic text-lg opacity-60">{p}.</span>
                              <textarea 
                                 value={profile.phaseNotes?.[p] || ''}
                                 onChange={(e) => onUpdate({ 
                                    ...profile, 
                                    phaseNotes: { ...profile.phaseNotes, [p]: e.target.value } 
                                 })}
                                 placeholder={`Needs during this phase...`}
                                 className="w-full bg-stone-50 border-l-2 border-editorial-line pl-5 py-4 serif italic outline-none focus:border-editorial-accent min-h-[100px] text-xs leading-relaxed"
                              />
                           </div>
                        ))}
                     </div>
                  </div>

                  {/* The Letter */}
                  <section className="space-y-8 pt-8 border-t border-editorial-line">
                    <label className="text-[10px] font-bold uppercase tracking-[3px] text-editorial-accent block">The Dossier Entry (A Permanent Letter)</label>
                    <div className="bg-editorial-bg p-12 border border-editorial-line shadow-inner relative">
                       <Mail className="absolute -top-3 left-10 w-6 h-6 text-editorial-accent bg-editorial-bg px-1" />
                       <textarea 
                          value={profile.letter || ''}
                          onChange={(e) => onUpdate({ ...profile, letter: e.target.value })}
                          placeholder="Compose archival thoughts, promises, or a lasting message to keep in mind..."
                          className="w-full bg-transparent min-h-[400px] serif italic leading-[2] text-lg outline-none focus:placeholder-transparent placeholder:opacity-40"
                       />
                       <div className="mt-8 pt-8 border-t border-editorial-line flex justify-end">
                         <span className="serif italic opacity-40 text-sm">— Archived for clarity.</span>
                       </div>
                    </div>
                  </section>

                </div>
              )}
              {activeTab === 'settings' && (
                <div className="max-w-md space-y-12 pb-20">
                  <h4 className="serif text-4xl italic">Parameters.</h4>
                  
                  <div className="space-y-10">
                    <div className="flex items-center gap-8">
                      <div className="w-24 h-24 rounded-full border border-editorial-line overflow-hidden bg-editorial-bg shrink-0">
                        {profile.avatarUrl ? (
                          <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className={cn("w-full h-full", profile.color)} />
                        )}
                      </div>
                      <div>
                        <label className="cursor-pointer text-[10px] uppercase tracking-widest font-bold text-editorial-accent border border-editorial-accent px-4 py-2 rounded-sm hover:bg-editorial-accent hover:text-white transition-all">
                          Update Portrait
                          <input 
                            type="file" 
                            className="hidden" 
                            accept="image/*" 
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => onUpdate({ ...profile, avatarUrl: reader.result as string });
                                reader.readAsDataURL(file);
                              }
                            }} 
                          />
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-[2px] opacity-40 mb-2 block">Identity</label>
                      <input 
                        type="text" 
                        value={profile.name}
                        onChange={(e) => onUpdate({ ...profile, name: e.target.value })}
                        className="w-full bg-transparent border-b border-editorial-line p-2 serif text-2xl outline-none focus:border-editorial-accent transition-all"
                        placeholder="Name"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-[2px] opacity-40 mb-2 block">Folder Association</label>
                      <input 
                        type="text" 
                        value={profile.folder || ''}
                        onChange={(e) => onUpdate({ ...profile, folder: e.target.value || undefined })}
                        className="w-full bg-transparent border-b border-editorial-line p-2 serif text-2xl outline-none focus:border-editorial-accent transition-all"
                        placeholder="e.g. Workplace, Family"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-[2px] opacity-40 mb-2 block">Birthday</label>
                        <input 
                          type="date" 
                          value={profile.birthday?.split('T')[0] || ''}
                          onChange={(e) => onUpdate({ ...profile, birthday: e.target.value })}
                          className="w-full bg-transparent border-b border-editorial-line p-2 serif text-xl outline-none focus:border-editorial-accent transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-[2px] opacity-40 mb-2 block">Gender Preference</label>
                        <input 
                          type="text" 
                          value={profile.genderPreference || ''}
                          onChange={(e) => onUpdate({ ...profile, genderPreference: e.target.value })}
                          className="w-full bg-transparent border-b border-editorial-line p-2 serif text-xl outline-none focus:border-editorial-accent transition-all"
                          placeholder="e.g. She/Her"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-[2px] opacity-40 mb-2 block">Cycle Length</label>
                        <input 
                          type="number" 
                          value={profile.averageCycleLength}
                          onChange={(e) => onUpdate({ ...profile, averageCycleLength: parseInt(e.target.value) || 28 })}
                          className="w-full bg-transparent border-b border-editorial-line p-2 serif text-2xl outline-none focus:border-editorial-accent transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-[2px] opacity-40 mb-2 block">Period Duration</label>
                        <input 
                          type="number" 
                          value={profile.averagePeriodLength}
                          onChange={(e) => onUpdate({ ...profile, averagePeriodLength: parseInt(e.target.value) || 5 })}
                          className="w-full bg-transparent border-b border-editorial-line p-2 serif text-2xl outline-none focus:border-editorial-accent transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-6 pt-6">
                      <div className="flex justify-between items-end">
                        <h5 className="text-[10px] font-black uppercase tracking-[3px] text-editorial-accent">Social Links</h5>
                        <button 
                          onClick={() => {
                            const url = prompt('Enter Social URL:');
                            if (url) {
                              const platform = url.includes('twitter') ? 'Twitter' : url.includes('github') ? 'GitHub' : url.includes('linkedin') ? 'LinkedIn' : url.includes('instagram') ? 'Instagram' : 'Link';
                              onUpdate({ ...profile, socialLinks: [...(profile.socialLinks || []), { id: crypto.randomUUID(), platform, url }] });
                            }
                          }}
                          className="text-editorial-ink/40 hover:text-editorial-accent transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="space-y-3">
                        {profile.socialLinks?.map(link => (
                          <div key={link.id} className="flex justify-between items-center group">
                            <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm hover:text-editorial-accent transition-colors">
                              <ExternalLink className="w-3.5 h-3.5 opacity-40" />
                              <span className="serif italic">{link.platform}</span>
                              <span className="text-[10px] uppercase tracking-widest opacity-30 truncate max-w-[150px]">{link.url}</span>
                            </a>
                            <button 
                              onClick={() => onUpdate({ ...profile, socialLinks: profile.socialLinks?.filter(l => l.id !== link.id) })}
                              className="opacity-0 group-hover:opacity-100 p-1 text-red-400"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-6 pt-6 border-t border-editorial-line">
                      <div className="flex justify-between items-end">
                        <h5 className="text-[10px] font-black uppercase tracking-[3px] text-editorial-accent">General Attachments</h5>
                        <label className="cursor-pointer text-editorial-ink/40 hover:text-editorial-accent transition-colors">
                          <Paperclip className="w-4 h-4" />
                          <input 
                            type="file" 
                            className="hidden" 
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  onUpdate({ 
                                    ...profile, 
                                    attachments: [
                                      ...(profile.attachments || []), 
                                      { 
                                        id: crypto.randomUUID(), 
                                        name: file.name, 
                                        url: reader.result as string, 
                                        type: file.type,
                                        date: new Date().toISOString()
                                      }
                                    ] 
                                  });
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                      </div>
                      <div className="space-y-3">
                        {profile.attachments?.map(file => (
                          <div key={file.id} className="flex justify-between items-center group p-4 border border-editorial-line bg-editorial-sidebar/30 rounded-sm">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-editorial-surface flex items-center justify-center">
                                {file.type.includes('image') ? <Camera className="w-5 h-5 opacity-40" /> : <FileText className="w-5 h-5 opacity-40" />}
                              </div>
                              <div>
                                <p className="text-xs font-bold truncate max-w-[150px]">{file.name}</p>
                                <p className="text-[9px] uppercase tracking-widest opacity-30">{format(parseISO(file.date), 'MMM d, h:mm a')}</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <a 
                                href={file.url} 
                                download={file.name}
                                className="p-2 opacity-40 hover:opacity-100 hover:text-editorial-accent transition-all"
                              >
                                <FileDown className="w-4 h-4" />
                              </a>
                              <button 
                                onClick={() => onUpdate({ ...profile, attachments: profile.attachments?.filter(a => a.id !== file.id) })}
                                className="p-2 opacity-0 group-hover:opacity-100 text-red-400"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {isLogging && (
        <LogForm 
          profile={profile}
          initialLog={editingLog || undefined} 
          onSave={(logData) => {
            if ('id' in logData) {
              updateLog(logData as DailyLog);
            } else {
              addLog(logData);
            }
          }} 
          onClose={() => {
            setIsLogging(false);
            setEditingLog(null);
          }} 
        />
      )}

      {isSettingEstimates && (
        <EstimateForm 
          profile={profile} 
          onSave={(updates) => {
            onUpdate({ ...profile, ...updates });
            setIsSettingEstimates(false);
          }} 
          onClose={() => setIsSettingEstimates(false)} 
        />
      )}

      {isAdjustingPeriod && (
        <PeriodForm 
          profile={profile}
          isOnPeriod={isOnPeriod}
          onSave={onPeriodUpdate}
          onClose={() => setIsAdjustingPeriod(false)}
        />
      )}
    </div>
  );
}

function StatusCard({ icon: Icon, label, value, color = "text-editorial-ink" }: { icon: any, label: string, value: string, color?: string }) {
  return (
    <div className="bg-editorial-surface p-6 border-b border-editorial-line">
      <Icon className="w-5 h-5 text-editorial-accent mb-4" />
      <span className="text-[9px] uppercase font-bold text-editorial-ink/40 tracking-[2px] block mb-1">{label}</span>
      <span className={cn("text-xl serif italic", color)}>{value}</span>
    </div>
  );
}

function LogForm({ profile, onSave, onClose, initialLog }: { profile: Profile, onSave: (log: Omit<DailyLog, 'id'> | DailyLog) => void, onClose: () => void, initialLog?: DailyLog }) {
  const [moods, setMoods] = useState<Mood[]>(initialLog?.moods || []);
  const [symptoms, setSymptoms] = useState<Symptom[]>(initialLog?.symptoms || []);
  const [notes, setNotes] = useState(initialLog?.notes || '');
  const [logDate, setLogDate] = useState(initialLog?.date?.split('T')[0] || new Date().toISOString().split('T')[0]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-editorial-ink/20 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-editorial-bg w-full max-w-lg p-6 sm:p-12 shadow-2xl relative border border-editorial-line overflow-y-auto max-h-[90vh]"
      >
        <button onClick={onClose} className="absolute top-6 right-6 sm:top-10 sm:right-10 p-2 hover:opacity-50 transition-opacity z-10">
          <Plus className="w-6 h-6 rotate-45 text-editorial-secondary" />
        </button>

        <div className="flex items-center gap-6 mb-12">
          {profile.avatarUrl ? (
            <div className="w-16 h-16 rounded-sm border border-editorial-line overflow-hidden rotate-[-3deg] shrink-0 shadow-lg shadow-editorial-ink/5">
              <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full object-cover grayscale" referrerPolicy="no-referrer" />
            </div>
          ) : (
            <div className={cn("w-16 h-16 rounded-sm border border-editorial-line rotate-[-3deg] shrink-0 shadow-lg shadow-editorial-ink/5 flex items-center justify-center text-white text-3xl font-light serif italic", profile.color)}>
              {profile.name.charAt(0)}
            </div>
          )}
          <h3 className="serif text-3xl sm:text-4xl italic">Observations.</h3>
        </div>
        
        <div className="space-y-10">
          <div>
            <label className="text-[10px] uppercase font-bold text-editorial-ink/40 tracking-[2px] mb-4 block">Archive Date</label>
            <input 
              type="date" 
              value={logDate}
              onChange={(e) => setLogDate(e.target.value)}
              className="w-full bg-editorial-surface border border-editorial-line p-4 serif text-lg outline-none focus:border-editorial-accent transition-all"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-editorial-ink/40 tracking-[2px] mb-4 block">Mood States</label>
            <div className="flex flex-wrap gap-3">
              {MOODS.map(mood => (
                <button
                  key={mood}
                  onClick={() => moods.includes(mood) ? setMoods(moods.filter(m => m !== mood)) : setMoods([...moods, mood])}
                  className={cn(
                    "px-4 py-2 text-xs font-bold tracking-tight border transition-all",
                    moods.includes(mood) ? "bg-editorial-secondary border-editorial-secondary text-white" : "border-editorial-line text-editorial-ink/50"
                  )}
                >
                  {mood}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-editorial-ink/40 tracking-[2px] mb-4 block">Manifestations</label>
            <div className="flex flex-wrap gap-3">
              {SYMPTOMS.map(symptom => (
                <button
                  key={symptom}
                  onClick={() => symptoms.includes(symptom) ? setSymptoms(symptoms.filter(s => s !== symptom)) : setSymptoms([...symptoms, symptom])}
                  className={cn(
                    "px-4 py-2 text-xs font-bold tracking-tight border transition-all",
                    symptoms.includes(symptom) ? "bg-editorial-accent border-editorial-accent text-white" : "border-editorial-line text-editorial-ink/50"
                  )}
                >
                  {symptom}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-editorial-ink/40 tracking-[2px] mb-4 block">Narrative</label>
            <textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Record any specific shifts..."
              className="w-full bg-editorial-surface border border-editorial-line p-4 h-24 serif italic text-lg outline-none focus:border-editorial-accent transition-all resize-none"
            />
          </div>

          <button 
            onClick={() => onSave({ ...(initialLog ? { id: initialLog.id } : {}), date: logDate, moods, symptoms, notes } as any)}
            className="w-full py-4 bg-editorial-ink text-white text-[10px] uppercase tracking-[3px] font-bold hover:bg-neutral-800 transition-all shadow-xl shadow-editorial-ink/10"
          >
            {initialLog ? 'Update Entry' : 'Archive Log'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function PeriodForm({ profile, isOnPeriod, onSave, onClose }: { profile: Profile, isOnPeriod: boolean, onSave: (date: string) => void, onClose: () => void }) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-editorial-ink/20 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-editorial-bg w-full max-w-sm p-6 sm:p-12 shadow-2xl relative border border-editorial-line"
      >
        <button onClick={onClose} className="absolute top-6 right-6 sm:top-10 sm:right-10 p-2 hover:opacity-50 transition-opacity z-10">
          <Plus className="w-6 h-6 rotate-45 text-editorial-secondary" />
        </button>

        <div className="flex items-center gap-6 mb-8">
          {profile.avatarUrl ? (
            <div className="w-12 h-12 rounded-sm border border-editorial-line overflow-hidden rotate-[-2deg] shrink-0">
              <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full object-cover grayscale" referrerPolicy="no-referrer" />
            </div>
          ) : (
            <div className={cn("w-12 h-12 rounded-sm border border-editorial-line rotate-[-2deg] shrink-0 flex items-center justify-center text-white text-xl font-light serif italic", profile.color)}>
              {profile.name.charAt(0)}
            </div>
          )}
          <h3 className="serif text-2xl italic">{isOnPeriod ? 'End Cycle.' : 'Start Period.'}</h3>
        </div>
        
        <div className="space-y-8">
          <div>
            <label className="text-[10px] uppercase font-bold text-editorial-ink/40 tracking-[2px] mb-4 block">Event Date</label>
            <input 
              type="date" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-editorial-surface border border-editorial-line p-4 serif text-lg outline-none focus:border-editorial-accent transition-all"
            />
          </div>

          <button 
            onClick={() => onSave(date)}
            className="w-full py-4 bg-editorial-accent text-white text-[10px] uppercase tracking-[3px] font-bold hover:bg-opacity-90 transition-all shadow-xl shadow-editorial-accent/10"
          >
            Confirm Change
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function CycleCalendar({ profile }: { profile: Profile }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getDayStatus = (date: Date) => {
    const isPeriodDay = profile.cycles.some(cycle => {
      const start = parseISO(cycle.startDate);
      const end = cycle.endDate ? parseISO(cycle.endDate) : (isSameDay(start, new Date()) || date < start ? start : new Date());
      
      const d = new Date(date).setHours(0,0,0,0);
      const s = new Date(start).setHours(0,0,0,0);
      const e = new Date(end).setHours(23,59,59,999);
      return (d >= s && d <= e);
    });

    // Projections
    let isProjectedPeriod = false;
    let isProjectedOvulation = false;
    
    const cycleLength = profile.averageCycleLength || 28;
    const periodLength = profile.averagePeriodLength || 5;
    
    // Find relevant reference point for projections
    const lastCycle = profile.cycles[profile.cycles.length - 1];
    
    if (lastCycle) {
      const lastStart = parseISO(lastCycle.startDate);
      
      // Project 3 cycles ahead to cover any potential month view
      for (let i = 1; i <= 3; i++) {
        const projectedStart = (profile.manualNextPeriodDate && i === 1)
          ? parseISO(profile.manualNextPeriodDate) 
          : addDays(lastStart, cycleLength * i);
          
        const projectedEnd = addDays(projectedStart, periodLength - 1);
        
        const projectedOvulation = (profile.manualOvulationDate && i === 1)
          ? parseISO(profile.manualOvulationDate)
          : addDays(projectedStart, -14);

        const d = new Date(date).setHours(0,0,0,0);
        const ps = new Date(projectedStart).setHours(0,0,0,0);
        const pe = new Date(projectedEnd).setHours(23,59,59,999);
        const po = new Date(projectedOvulation).setHours(0,0,0,0);

        if (d >= ps && d <= pe) {
          isProjectedPeriod = true;
        }
        if (d === po) {
          isProjectedOvulation = true;
        }
      }
    }

    const hasLog = profile.logs.some(log => isSameDay(parseISO(log.date), date));

    return { isPeriodDay, hasLog, isProjectedPeriod, isProjectedOvulation };
  };

  return (
    <div className="space-y-12">
      <div className="flex justify-between items-baseline border-b border-editorial-line pb-8">
        <h4 className="serif text-4xl md:text-6xl font-light">{format(currentMonth, 'MMMM')}</h4>
        <div className="flex gap-4 sm:gap-8">
          <button onClick={() => setCurrentMonth(addDays(monthStart, -1))} className="opacity-30 hover:opacity-100 transition-opacity"><ChevronLeft className="w-6 h-6" /></button>
          <button onClick={() => setCurrentMonth(addDays(monthEnd, 1))} className="opacity-30 hover:opacity-100 transition-opacity rotate-180"><ChevronLeft className="w-6 h-6" /></button>
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-px">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
          <div key={d} className="text-center text-[9px] font-bold text-editorial-ink/30 uppercase py-4">{d}</div>
        ))}
        {Array.from({ length: monthStart.getDay() }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square border-t border-editorial-line" />
        ))}
        {daysInMonth.map(day => {
          const { isPeriodDay, hasLog, isProjectedPeriod, isProjectedOvulation } = getDayStatus(day);
          return (
            <div 
              key={day.toISOString()}
              className={cn(
                "aspect-square flex flex-col items-center justify-center relative border-t border-editorial-line transition-all group",
                isToday(day) ? "bg-editorial-sidebar" : "",
                isPeriodDay ? "bg-editorial-accent/10 border-b-2 border-b-editorial-accent" : "hover:bg-editorial-sidebar/50",
                !isPeriodDay && isProjectedPeriod ? "bg-editorial-accent/5" : ""
              )}
            >
              {isProjectedOvulation && (
                <div className="absolute top-2 right-2 text-editorial-accent">
                  <Sparkles className="w-3 h-3" />
                </div>
              )}
              {!isPeriodDay && isProjectedPeriod && (
                <div className="absolute inset-0 border border-dashed border-editorial-accent/30 m-1 pointer-events-none" />
              )}
              <span className={cn(
                "serif italic text-2xl relative z-10",
                isPeriodDay ? "text-editorial-accent font-bold" : (isProjectedPeriod ? "text-editorial-accent/60" : "opacity-40")
              )}>
                {format(day, 'd')}
              </span>
              {hasLog && (
                <div className="w-1.5 h-1.5 rounded-full bg-editorial-secondary mt-1 relative z-10" />
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-12 pt-8 border-t border-editorial-line text-[9px] font-bold uppercase tracking-[2px] opacity-40">
        <div className="flex items-center gap-3"><div className="w-3 h-1 bg-editorial-accent" /> Active Flow</div>
        <div className="flex items-center gap-3"><div className="w-3 h-1 border border-dashed border-editorial-accent/30" /> Projected Flow</div>
        <div className="flex items-center gap-3"><Sparkles className="w-3 h-3 text-editorial-accent" /> Projected Ovulation</div>
        <div className="flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full bg-editorial-secondary" /> Observation</div>
        <div className="flex items-center gap-3"><div className="w-3 h-3 border border-editorial-line bg-editorial-sidebar" /> Today</div>
      </div>
    </div>
  );
}

function LogsList({ logs, onEdit, onDelete }: { logs: DailyLog[], onEdit: (log: DailyLog) => void, onDelete: (id: string) => void }) {
  if (logs.length === 0) {
    return (
      <div className="py-24 text-center">
        <p className="serif italic text-2xl opacity-30">No narratives archived yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-24 max-w-2xl">
      {logs.map(log => (
        <div key={log.id} className="relative group">
          <div className="text-[10px] uppercase font-bold tracking-[3px] opacity-30 mb-8 flex items-baseline gap-4">
            {format(parseISO(log.date), 'EEEE, MMM do')}
            <div className="h-px flex-1 bg-editorial-line" />
            <div className="flex gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={() => onEdit(log)}
                className="hover:text-editorial-accent transition-colors"
                title="Edit Narrative"
              >
                Edit
              </button>
              <button 
                onClick={() => {
                  if (confirm('Delete this record definitively?')) {
                    onDelete(log.id);
                  }
                }}
                className="hover:text-red-800 transition-colors"
                title="Delete Record"
              >
                Delete
              </button>
            </div>
          </div>
          <div className="pl-12 border-l border-editorial-accent">
            <div className="flex flex-wrap gap-4 mb-8">
              {log.moods.map(m => (
                <span key={m} className="serif italic text-2xl text-editorial-secondary">{m}</span>
              ))}
              {log.symptoms.map(s => (
                <span key={s} className="serif italic text-2xl text-editorial-accent">{s}</span>
              ))}
            </div>
            {log.notes && (
              <p className="serif text-xl leading-relaxed text-editorial-ink/80 italic">
                "{log.notes}"
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function CyclesList({ cycles, onDelete, onUpdateCycle }: { cycles: Cycle[], onDelete: (id: string) => void, onUpdateCycle: (cycle: Cycle) => void }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ startDate: string, endDate?: string }>({ startDate: '' });

  if (cycles.length === 0) {
    return (
      <div className="py-24 text-center">
        <p className="serif italic text-2xl opacity-30">No biological archives yet.</p>
      </div>
    );
  }

  // Sort cycles by date descending
  const sortedCycles = [...cycles].sort((a, b) => b.startDate.localeCompare(a.startDate));

  return (
    <div className="space-y-12 max-w-2xl">
      {sortedCycles.map(cycle => (
        <div key={cycle.id} className="p-8 border border-editorial-line bg-editorial-surface/50 relative group">
          {editingId === cycle.id ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <label className="text-[10px] uppercase font-bold text-editorial-ink/40 tracking-[2px] mb-2 block">Cycle Commencement</label>
                  <input 
                    type="date"
                    value={editForm.startDate.split('T')[0]}
                    onChange={(e) => setEditForm({ ...editForm, startDate: new Date(e.target.value).toISOString() })}
                    className="w-full bg-transparent border-b border-editorial-line p-2 serif text-xl outline-none focus:border-editorial-accent"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-editorial-ink/40 tracking-[2px] mb-2 block">Cycle Completion</label>
                  <input 
                    type="date"
                    value={editForm.endDate?.split('T')[0] || ''}
                    onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                    className="w-full bg-transparent border-b border-editorial-line p-2 serif text-xl outline-none focus:border-editorial-accent"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-4 pt-4">
                <button 
                  onClick={() => setEditingId(null)}
                  className="text-[10px] uppercase tracking-[2px] font-bold opacity-40 hover:opacity-100"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    onUpdateCycle({ ...cycle, startDate: editForm.startDate, endDate: editForm.endDate });
                    setEditingId(null);
                  }}
                  className="text-[10px] uppercase tracking-[2px] font-bold text-editorial-accent"
                >
                  Commit Changes
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-start mb-4">
                <div className="space-y-1">
                  <h4 className="serif text-2xl italic">
                    {format(parseISO(cycle.startDate), 'MMMM do, yyyy')}
                  </h4>
                  <p className="text-[10px] uppercase tracking-[2px] font-bold opacity-30">
                    {cycle.endDate 
                      ? `Duration: ${differenceInDays(parseISO(cycle.endDate), parseISO(cycle.startDate))} Days` 
                      : 'Ongoing Cycle'}
                  </p>
                </div>
                <div className="flex gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => {
                      setEditingId(cycle.id);
                      setEditForm({ startDate: cycle.startDate, endDate: cycle.endDate });
                    }}
                    className="text-[10px] uppercase tracking-[2px] font-bold opacity-40 hover:opacity-100 hover:text-editorial-accent transition-all"
                  >
                    Adjust
                  </button>
                  <button 
                    onClick={() => {
                      if (confirm('Archive this biological record permanently? This cannot be undone.')) {
                        onDelete(cycle.id);
                      }
                    }}
                    className="text-[10px] uppercase tracking-[2px] font-bold opacity-40 hover:opacity-100 hover:text-red-800 transition-all"
                  >
                    Delete
                  </button>
                </div>
              </div>
              {cycle.endDate && (
                <div className="serif italic text-stone-400">
                  Concluded on {format(parseISO(cycle.endDate), 'MMMM do')}
                </div>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}

function EstimateForm({ 
  profile, 
  onSave, 
  onClose 
}: { 
  profile: Profile, 
  onSave: (updates: Partial<Profile>) => void, 
  onClose: () => void 
}) {
  const [bleedingDate, setBleedingDate] = useState(profile.manualNextPeriodDate || '');
  const [ovulationDate, setOvulationDate] = useState(profile.manualOvulationDate || '');

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-editorial-ink/30 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-editorial-bg w-full max-w-lg p-6 sm:p-12 shadow-2xl relative border border-editorial-line overflow-y-auto max-h-[90vh]"
      >
        <button onClick={onClose} className="absolute top-6 right-6 sm:top-10 sm:right-10 p-2 hover:opacity-50 transition-opacity z-10">
          <Plus className="w-6 h-6 rotate-45 text-editorial-secondary" />
        </button>

        <div className="flex items-center gap-6 mb-8">
          {profile.avatarUrl ? (
            <div className="w-16 h-16 rounded-sm border border-editorial-line overflow-hidden rotate-[-3deg] shrink-0 shadow-lg shadow-editorial-ink/5">
              <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full object-cover grayscale" referrerPolicy="no-referrer" />
            </div>
          ) : (
            <div className={cn("w-16 h-16 rounded-sm border border-editorial-line rotate-[-3deg] shrink-0 shadow-lg shadow-editorial-ink/5 flex items-center justify-center text-white text-3xl font-light serif italic", profile.color)}>
              {profile.name.charAt(0)}
            </div>
          )}
          <div>
            <h3 className="serif text-3xl sm:text-4xl italic text-editorial-secondary leading-none">Projections.</h3>
            <p className="text-[10px] uppercase tracking-[2px] opacity-40 mt-1">Manual Cycle Estimates</p>
          </div>
        </div>
        
        <div className="space-y-12">
          <div>
            <label className="text-[10px] uppercase font-bold text-editorial-ink/40 tracking-[2px] mb-4 block">Next Expected Bleeding</label>
            <input 
              type="date" 
              value={bleedingDate}
              onChange={(e) => setBleedingDate(e.target.value)}
              className="w-full bg-editorial-surface border border-editorial-line p-4 serif italic text-2xl outline-none focus:border-editorial-accent transition-all"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-editorial-ink/40 tracking-[2px] mb-4 block">Next Expected Ovulation</label>
            <input 
              type="date" 
              value={ovulationDate}
              onChange={(e) => setOvulationDate(e.target.value)}
              className="w-full bg-editorial-surface border border-editorial-line p-4 serif italic text-2xl outline-none focus:border-editorial-accent transition-all"
            />
          </div>

          <div className="flex gap-4">
            <button 
              onClick={() => {
                setBleedingDate('');
                setOvulationDate('');
              }}
              className="flex-1 py-4 border border-editorial-line text-[10px] uppercase tracking-[3px] font-bold hover:bg-stone-50 transition-all opacity-40 hover:opacity-100"
            >
              Reset
            </button>
            <button 
              onClick={() => onSave({ 
                manualNextPeriodDate: bleedingDate || undefined, 
                manualOvulationDate: ovulationDate || undefined 
              })}
              className="flex-[2] py-4 bg-editorial-secondary text-white text-[10px] uppercase tracking-[3px] font-bold hover:bg-neutral-800 transition-all shadow-xl shadow-editorial-ink/10"
            >
              Update Projections
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function RecycleBinModal({ 
  profiles, 
  onRestore, 
  onPermanentDelete, 
  onClose 
}: { 
  profiles: Profile[], 
  onRestore: (id: string) => void, 
  onPermanentDelete: (id: string) => void,
  onClose: () => void 
}) {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-editorial-ink/40 backdrop-blur-xl">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-editorial-bg w-full max-w-2xl p-6 sm:p-12 shadow-2xl relative border border-editorial-line h-[90vh] sm:h-[80vh] flex flex-col"
      >
        <button onClick={onClose} className="absolute top-6 right-6 sm:top-10 sm:right-10 p-2 hover:opacity-50 transition-opacity z-10">
          <Plus className="w-6 h-6 rotate-45 text-editorial-secondary" />
        </button>

        <h3 className="serif text-3xl sm:text-4xl mb-4 italic text-editorial-secondary">Hibernating Assets.</h3>
        <p className="text-xs sm:text-sm opacity-50 mb-8 sm:mb-12">Profiles here are invisible to the main interface. They will be permanently expunged 30 days after initial hibernation.</p>
        
        <div className="flex-1 overflow-y-auto pr-4 space-y-6">
          {profiles.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-20">
              <Trash2 className="w-24 h-24 mb-6 stroke-1" />
              <p className="serif italic text-2xl">The bin is empty.</p>
            </div>
          ) : (
            profiles.map(p => {
              const daysLeft = 30 - differenceInDays(new Date(), parseISO(p.deletedAt!));
              return (
                <div key={p.id} className="p-8 bg-editorial-surface border border-editorial-line flex items-center justify-between group">
                  <div className="flex items-center gap-6">
                    <div className={cn("w-16 h-16 rounded-full overflow-hidden border border-editorial-line", p.color)}>
                      {p.avatarUrl && <img src={p.avatarUrl} alt="" className="w-full h-full object-cover grayscale opacity-50" referrerPolicy="no-referrer" />}
                    </div>
                    <div>
                      <h4 className="serif text-2xl italic leading-none mb-2">{p.name}</h4>
                      <p className="text-[10px] uppercase tracking-[2px] font-bold opacity-30">
                        {daysLeft} Days until permanent removal
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-6">
                    <button 
                      onClick={() => onRestore(p.id)}
                      className="text-[10px] uppercase tracking-[2px] font-bold text-editorial-accent hover:opacity-100 opacity-60 transition-all"
                    >
                      Restore
                    </button>
                    <button 
                      onClick={() => onPermanentDelete(p.id)}
                      className="text-[10px] uppercase tracking-[2px] font-bold text-red-800 hover:opacity-100 opacity-40 transition-all"
                    >
                      Expunge
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </motion.div>
    </div>
  );
}
