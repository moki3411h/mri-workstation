// Save / Load exam state as JSON
// Persists: patient, safety, sequences, params, fov, slice, wl, images (optional)

import type { WorkstationStore } from '@/store/workstationStore';
import { db, auth } from '@/lib/firebase';
import { collection, doc, setDoc, getDoc, getDocs, query, orderBy, limit, serverTimestamp } from 'firebase/firestore';

export interface ExamSnapshot {
  version:   '1.0';
  savedAt:   string;
  patient:   WorkstationStore['patient'];
  safety:    WorkstationStore['safety'];
  sequences: WorkstationStore['sequences'];
  params:    WorkstationStore['params'];
  planning:  WorkstationStore['planning'];
  wl:        WorkstationStore['wl'];
  show:      WorkstationStore['show'];
  /** @deprecated kept for backwards compat */
  slice?:    WorkstationStore['wl'];
}

export function exportExam(store: Pick<WorkstationStore,
  'patient'|'safety'|'sequences'|'params'|'planning'|'wl'|'show'
>): ExamSnapshot {
  return {
    version:  '1.0',
    savedAt:  new Date().toISOString(),
    patient:  store.patient,
    safety:   store.safety,
    sequences: store.sequences,
    params:   store.params,
    planning: store.planning,
    wl:       store.wl,
    show:     store.show,
  };
}

export function downloadJSON(data: object, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type:'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function readJSONFile(file: File): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = e => {
      try { resolve(JSON.parse(e.target?.result as string)); }
      catch { reject(new Error('Invalid JSON file')); }
    };
    reader.onerror = () => reject(new Error('File read error'));
    reader.readAsText(file);
  });
}

export function validateSnapshot(data: unknown): data is ExamSnapshot {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as Record<string, any>;
  if (d.version !== '1.0') return false;
  if (typeof d.patient !== 'object') return false;
  if (typeof d.sequences !== 'object') return false;
  if (typeof d.params !== 'object') return false;
  if (typeof d.planning !== 'object') return false;
  if (typeof d.slice !== 'object') return false;
  return true;
}

// ─── Firebase Cloud Storage ────────────────────────────────────────────────
export async function saveExamToCloud(snap: ExamSnapshot): Promise<string> {
  if (!auth.currentUser) throw new Error("Must be authenticated to save");
  const examId = `exam_${snap.patient.patientId || Date.now()}_${Date.now()}`;
  
  const docRef = doc(db, 'exams', examId);
  await setDoc(docRef, {
    ...snap,
    userId: auth.currentUser.uid,
    createdAt: serverTimestamp(),
  });
  
  return examId;
}

export async function loadExamFromCloud(examId: string): Promise<ExamSnapshot> {
  const docRef = doc(db, 'exams', examId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) throw new Error("Exam not found");
  
  const data = snap.data();
  if (!validateSnapshot(data)) throw new Error("Invalid exam data format in cloud");
  return data;
}

export interface CloudExamMeta {
  id: string;
  patientName: string;
  patientId: string;
  study: string;
  savedAt: string;
}

export async function listCloudExams(): Promise<CloudExamMeta[]> {
  const q = query(collection(db, 'exams'), orderBy('createdAt', 'desc'), limit(50));
  const snap = await getDocs(q);
  
  return snap.docs.map(d => {
    const data = d.data() as ExamSnapshot;
    return {
      id: d.id,
      patientName: data.patient?.name || 'Unknown',
      patientId: data.patient?.patientId || 'Unknown',
      study: data.patient?.study || 'Unknown',
      savedAt: data.savedAt,
    };
  });
}
