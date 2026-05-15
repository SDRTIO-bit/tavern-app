"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { v4 as uuid } from "uuid";
import { WorldBook, WorldBookEntry } from "@/types/worldbook";

interface WorldBookState {
  /** 多本书 */
  books: WorldBook[];
  /** 当前激活的书 ID */
  activeBookId: string | null;
  /** 全局开关 */
  enabled: boolean;

  // 书管理
  addBook: (name: string) => void;
  removeBook: (id: string) => void;
  renameBook: (id: string, name: string) => void;
  setActiveBook: (id: string | null) => void;
  setEnabled: (v: boolean) => void;

  // 条目管理
  addEntry: (bookId: string, data: Omit<WorldBookEntry, "id">) => void;
  updateEntry: (bookId: string, entryId: string, data: Partial<WorldBookEntry>) => void;
  removeEntry: (bookId: string, entryId: string) => void;
  toggleEntry: (bookId: string, entryId: string) => void;

  /** 获取所有条目（展平） */
  getAllEntries: () => WorldBookEntry[];

  // 导入导出
  importBook: (book: WorldBook) => void;
  exportBook: (id: string) => WorldBook | undefined;
}

export const useWorldBookStore = create<WorldBookState>()(
  persist(
    (set, get) => ({
      books: [],
      activeBookId: null,
      enabled: true,

      addBook: (name) => {
        const book: WorldBook = { id: uuid(), name, entries: [], enabled: true };
        set({ books: [...get().books, book], activeBookId: book.id });
      },

      removeBook: (id) => {
        set({
          books: get().books.filter((b) => b.id !== id),
          activeBookId: get().activeBookId === id ? null : get().activeBookId,
        });
      },

      renameBook: (id, name) => {
        set({ books: get().books.map((b) => (b.id === id ? { ...b, name } : b)) });
      },

      setActiveBook: (id) => set({ activeBookId: id }),
      setEnabled: (v) => set({ enabled: v }),

      addEntry: (bookId, data) => {
        const entry: WorldBookEntry = { id: uuid(), ...data };
        set({
          books: get().books.map((b) =>
            b.id === bookId ? { ...b, entries: [...b.entries, entry] } : b
          ),
        });
      },

      updateEntry: (bookId, entryId, data) => {
        set({
          books: get().books.map((b) =>
            b.id === bookId
              ? { ...b, entries: b.entries.map((e) => (e.id === entryId ? { ...e, ...data } : e)) }
              : b
          ),
        });
      },

      removeEntry: (bookId, entryId) => {
        set({
          books: get().books.map((b) =>
            b.id === bookId ? { ...b, entries: b.entries.filter((e) => e.id !== entryId) } : b
          ),
        });
      },

      toggleEntry: (bookId, entryId) => {
        set({
          books: get().books.map((b) =>
            b.id === bookId
              ? {
                  ...b,
                  entries: b.entries.map((e) =>
                    e.id === entryId ? { ...e, enabled: !e.enabled } : e
                  ),
                }
              : b
          ),
        });
      },

      getAllEntries: () => {
        return get().books.flatMap((b) => (b.enabled ? b.entries : []));
      },

      importBook: (book) => {
        set({ books: [...get().books, { ...book, id: uuid() }] });
      },

      exportBook: (id) => {
        return get().books.find((b) => b.id === id);
      },
    }),
    { name: "tavern-worldbook" }
  )
);
