import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ThemeMode } from '@/styles/tokens'

/** UI preference cap ung dung - client state thuan tuy. */
interface AppState {
  sidebarCollapsed: boolean
  /**
   * Sidebar cua KHUNG LAM VIEC MOT DU AN - trang thai rieng, khong dung chung
   * voi `sidebarCollapsed`. Hai menu co do dai khac han nhau (18 phan he so voi
   * vai muc cua mot du an), nen thu gon cai nay khong co nghia la muon thu gon
   * cai kia; gop lam mot thi moi lan vao/ra du an lai phai chinh lai menu.
   */
  projectNavCollapsed: boolean
  /** Drawer tro ly dang mo hay khong. Khong persist - xem docblock cuoi file. */
  assistantOpen: boolean
  theme: ThemeMode
  toggleSidebar: () => void
  toggleProjectNav: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setAssistantOpen: (open: boolean) => void
  setTheme: (theme: ThemeMode) => void
  /** Doi nhanh Sang <-> Toi (Field Mode chon trong menu theme). */
  toggleTheme: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      projectNavCollapsed: false,
      assistantOpen: false,
      theme: 'light',
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      toggleProjectNav: () => set((s) => ({ projectNavCollapsed: !s.projectNavCollapsed })),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      setAssistantOpen: (assistantOpen) => set({ assistantOpen }),
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
    }),
    {
      name: 'erpcons.app',
      /*
       * CO Y khong luu `assistantOpen`: mo lai app ma drawer tu bat len la nap
       * WebSocket + duc ve cho mot nguoi chi dinh mo trang bao cao. Phien hoi
       * thoai dang do van duoc nho - nhung o localStorage rieng cua feature,
       * va chi doc khi nguoi dung THUC SU mo tro ly.
       */
      partialize: (s) => ({
        sidebarCollapsed: s.sidebarCollapsed,
        projectNavCollapsed: s.projectNavCollapsed,
        theme: s.theme,
      }),
    },
  ),
)
