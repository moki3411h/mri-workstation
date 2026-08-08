import type { Sequence } from '@/lib/scanEngine';

export type ProtocolContrast = 'Non-contrast' | 'Contrast optional' | 'With contrast';
export type ProtocolPopulation = 'Adult' | 'Pediatric' | 'Fetal';

export interface ProtocolPreset {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  group: string;
  name: string;
  description: string;
  contrast: ProtocolContrast;
  population: ProtocolPopulation;
  tags: string[];
  estimatedTime: string;
  sequences: Array<Omit<Sequence, 'id' | 'status'>>;
}

export interface ProtocolCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
  protocols: ProtocolPreset[];
}

type SequenceKey = keyof typeof SEQUENCE_LIBRARY;

interface GroupDefinition {
  name: string;
  description: string;
  recipe: SequenceKey[];
  protocols: string[];
  contrast?: ProtocolContrast;
  population?: ProtocolPopulation;
  tags?: string[];
}

interface CategoryDefinition {
  id: string;
  name: string;
  icon: string;
  description: string;
  groups: GroupDefinition[];
}

function sequence(
  name: string,
  ta: string,
  sl: number,
  tr: number,
  te: number,
  flipAngle: number,
  description: string,
  ti = 0,
  sarPct = 42,
): Omit<Sequence, 'id' | 'status'> {
  return { name, ta, sl, tr, te, ti, flipAngle, sarPct, description };
}

// Generic, vendor-neutral sequence families. These are educational simulator
// defaults, not scanner prescriptions or copied manufacturer protocols.
const SEQUENCE_LIBRARY = {
  localizer: sequence('3-Plane Localizer', '00:18', 3, 20, 5, 25, 'Three-plane positioning reference.', 0, 12),
  t1Sag: sequence('T1 Spin Echo SAG', '00:42', 24, 560, 11, 90, 'Sagittal T1-weighted anatomy.'),
  t1Ax: sequence('T1 Spin Echo AX', '00:44', 28, 580, 12, 90, 'Axial T1-weighted anatomy.'),
  t1Cor: sequence('T1 Spin Echo COR', '00:44', 28, 580, 12, 90, 'Coronal T1-weighted anatomy.'),
  t2Ax: sequence('T2 Fast Spin Echo AX', '00:52', 28, 5200, 96, 150, 'Axial T2-weighted fluid-sensitive imaging.', 0, 58),
  t2Cor: sequence('T2 Fast Spin Echo COR', '00:52', 28, 5200, 96, 150, 'Coronal T2-weighted fluid-sensitive imaging.', 0, 58),
  t2Sag: sequence('T2 Fast Spin Echo SAG', '00:52', 24, 4800, 94, 150, 'Sagittal T2-weighted fluid-sensitive imaging.', 0, 58),
  flairAx: sequence('T2 FLAIR AX', '00:58', 28, 9000, 92, 150, 'Axial fluid-attenuated T2-weighted imaging.', 2500, 64),
  flair3d: sequence('3D T2 FLAIR ISO', '01:08', 176, 5000, 380, 120, 'Isotropic fluid-attenuated volume imaging.', 1650, 66),
  dwiBrain: sequence('Diffusion EPI AX + ADC', '00:42', 30, 4700, 82, 90, 'Diffusion-weighted brain imaging with ADC map.', 0, 34),
  swi: sequence('Susceptibility GRE AX', '00:54', 64, 29, 21, 15, 'Susceptibility-sensitive venous and blood-product imaging.', 0, 18),
  t1Volume: sequence('3D T1 Gradient Echo ISO', '01:04', 176, 1900, 2.8, 9, 'Isotropic T1-weighted volume for multiplanar reformats.', 900, 24),
  postBrain: sequence('T1 Fat-Suppressed POST 3-Plane', '01:12', 84, 610, 12, 90, 'Post-contrast T1-weighted multiplanar coverage.', 0, 52),
  perfusionBrain: sequence('Dynamic Susceptibility Perfusion', '00:52', 24, 1600, 34, 70, 'Dynamic perfusion source images and maps.', 0, 28),
  spectroscopy: sequence('Single-Voxel MR Spectroscopy', '01:20', 1, 2000, 35, 90, 'Educational localized proton spectroscopy acquisition.', 0, 20),
  dti: sequence('Diffusion Tensor AX', '01:18', 48, 7600, 86, 90, 'Multi-direction diffusion tensor source data.', 0, 36),
  bold: sequence('Task BOLD EPI', '01:30', 36, 2000, 30, 75, 'Functional BOLD time series for education.', 0, 20),
  tofHead: sequence('3D Time-of-Flight MRA', '01:02', 112, 24, 4, 20, 'Non-contrast inflow angiography of intracranial arteries.', 0, 18),
  mrVeno: sequence('3D Venography', '01:04', 96, 30, 6, 18, 'Venous volume acquisition with projection reformats.', 0, 18),
  csfFlow: sequence('Phase-Contrast CSF Flow', '00:48', 1, 34, 8, 15, 'Velocity-encoded CSF flow assessment.', 0, 16),

  spineT2Sag: sequence('T2 Fast Spin Echo SAG', '00:56', 18, 3600, 104, 150, 'Sagittal spine fluid-sensitive coverage.', 0, 62),
  spineT1Sag: sequence('T1 Fast Spin Echo SAG', '00:48', 18, 620, 11, 150, 'Sagittal spine T1-weighted anatomy.', 0, 55),
  spineStir: sequence('STIR SAG', '01:02', 18, 4200, 48, 150, 'Sagittal inversion-recovery fat suppression.', 180, 60),
  spineAx: sequence('T2 Fast Spin Echo AX', '01:02', 24, 3900, 105, 150, 'Targeted axial spine imaging.', 0, 64),
  spinePost: sequence('T1 Fat-Suppressed POST SAG + AX', '01:12', 42, 650, 12, 90, 'Post-contrast sagittal and axial spine coverage.', 0, 54),
  myelo3d: sequence('3D Heavily T2 Myelographic', '01:06', 96, 4800, 720, 120, 'High T2 contrast volume of the thecal sac.', 0, 48),

  t1FsAx: sequence('T1 Fat-Suppressed AX', '00:48', 28, 640, 13, 90, 'Axial fat-suppressed T1-weighted imaging.', 0, 48),
  t2FsAx: sequence('T2 Fat-Suppressed AX', '00:54', 30, 4300, 78, 150, 'Axial fluid-sensitive fat-suppressed imaging.', 0, 58),
  t2FsCor: sequence('T2 Fat-Suppressed COR', '00:54', 30, 4300, 78, 150, 'Coronal fluid-sensitive fat-suppressed imaging.', 0, 58),
  t2FsSag: sequence('T2 Fat-Suppressed SAG', '00:54', 26, 4300, 78, 150, 'Sagittal fluid-sensitive fat-suppressed imaging.', 0, 58),
  postSoftTissue: sequence('T1 Fat-Suppressed POST AX + COR', '01:06', 56, 690, 12, 90, 'Post-contrast multiplanar soft-tissue imaging.', 0, 52),

  pdFsSag: sequence('PD Fat-Suppressed SAG', '00:52', 28, 3000, 34, 150, 'Sagittal proton-density fat-suppressed joint imaging.', 0, 54),
  pdFsCor: sequence('PD Fat-Suppressed COR', '00:52', 28, 3000, 34, 150, 'Coronal proton-density fat-suppressed joint imaging.', 0, 54),
  pdFsAx: sequence('PD Fat-Suppressed AX', '00:52', 28, 3000, 34, 150, 'Axial proton-density fat-suppressed joint imaging.', 0, 54),
  t1Msk: sequence('T1 Fast Spin Echo', '00:46', 26, 610, 12, 150, 'High anatomic-detail T1-weighted MSK imaging.', 0, 50),
  cartilage3d: sequence('3D Cartilage Volume', '01:12', 96, 1500, 28, 25, 'Thin-section cartilage-sensitive volume imaging.', 0, 30),
  metalReduce: sequence('Metal Artifact Reduction Set', '01:20', 30, 4200, 48, 130, 'High-bandwidth multispectral-style educational acquisition.', 0, 46),
  arthroT1: sequence('T1 Fat-Suppressed Arthrogram 3-Plane', '01:10', 72, 650, 12, 90, 'Multiplanar post-arthrogram T1 fat-suppressed imaging.', 0, 48),

  t2SingleShotCor: sequence('T2 Single-Shot COR', '00:36', 30, 1100, 92, 120, 'Motion-robust coronal T2-weighted body overview.', 0, 38),
  t2BodyAx: sequence('T2 Fast Spin Echo AX', '00:50', 32, 3800, 86, 130, 'Axial T2-weighted body imaging.', 0, 46),
  t2BodyFs: sequence('T2 Fat-Suppressed AX', '00:54', 32, 4200, 82, 130, 'Axial fat-suppressed T2-weighted body imaging.', 0, 48),
  chemicalShift: sequence('T1 Chemical-Shift IP/OP AX', '00:38', 40, 125, 2.4, 70, 'Paired in-phase and opposed-phase imaging.', 0, 24),
  dwiBody: sequence('Body Diffusion AX + ADC', '00:56', 36, 5200, 72, 90, 'Body diffusion imaging with ADC map.', 0, 30),
  dceBody: sequence('3D T1 Dynamic PRE/POST', '01:18', 120, 4.1, 1.8, 12, 'Multiphasic T1-weighted dynamic volume imaging.', 0, 22),
  delayedBody: sequence('3D T1 Delayed POST', '00:46', 72, 4.1, 1.8, 12, 'Delayed post-contrast T1-weighted volume.', 0, 22),
  mrcp: sequence('3D Heavily T2 MRCP', '01:04', 96, 4200, 690, 120, 'Heavily T2-weighted biliary and pancreatic duct volume.', 0, 44),
  urography: sequence('3D Excretory MR Urography', '01:06', 88, 4.2, 1.9, 12, 'Excretory-phase urinary tract volume.', 0, 22),
  enterography: sequence('Dynamic Bowel Volume', '01:16', 100, 4.0, 1.7, 12, 'Multiphasic bowel-focused volume imaging.', 0, 22),
  pelvicT2HiRes: sequence('High-Resolution T2 Small-FoV', '01:06', 32, 4600, 96, 140, 'Small-field multiplanar pelvic T2-weighted imaging.', 0, 54),
  dynamicPelvis: sequence('Dynamic T1 Pelvis PRE/POST', '01:14', 108, 4.2, 1.9, 12, 'Dynamic pelvic T1-weighted volume.', 0, 22),

  breastT2: sequence('T2 Fat-Suppressed Breast AX', '00:58', 52, 4800, 82, 140, 'Bilateral fluid-sensitive breast imaging.', 0, 48),
  breastDwi: sequence('Breast Diffusion + ADC', '00:58', 36, 5600, 72, 90, 'Bilateral breast diffusion imaging.', 0, 28),
  breastDynamic: sequence('Bilateral Dynamic T1 PRE/POST', '01:28', 160, 4.6, 1.9, 12, 'High-temporal-resolution bilateral dynamic volume.', 0, 22),
  silicone: sequence('Silicone-Sensitive Implant Set', '01:08', 72, 4200, 78, 140, 'Silicone-sensitive and silicone-suppressed implant imaging.', 0, 46),

  blackBlood: sequence('Black-Blood T1/T2 AX', '00:54', 30, 1800, 62, 90, 'Dark-blood thoracic or cardiovascular anatomy.', 0, 38),
  cardiacCine: sequence('Balanced Cine Multi-Plane', '01:12', 14, 3.2, 1.5, 55, 'ECG-gated ventricular function cine stack.', 0, 16),
  cardiacFlow: sequence('Velocity-Encoded Flow', '00:54', 1, 5.2, 2.6, 15, 'Phase-contrast flow quantification.', 0, 14),
  cardiacPerfusion: sequence('First-Pass Perfusion', '01:04', 3, 2.4, 1.1, 12, 'Dynamic first-pass myocardial perfusion.', 0, 16),
  cardiacMaps: sequence('Native T1 + T2 Mapping', '01:16', 12, 280, 1.2, 35, 'Quantitative-style myocardial mapping for education.', 0, 18),
  cardiacLge: sequence('Late Enhancement Multi-Plane', '01:18', 24, 720, 1.8, 25, 'Inversion-recovery late enhancement imaging.', 280, 20),
  cardiacAngio: sequence('Contrast Angiographic Volume', '01:02', 84, 3.1, 1.2, 24, 'Timed contrast-enhanced cardiovascular volume.', 0, 20),

  mraNonContrast: sequence('Non-Contrast Inflow MRA', '01:10', 104, 26, 5.2, 22, 'Non-contrast inflow vascular volume.', 0, 18),
  mraContrast: sequence('Contrast-Enhanced 3D MRA', '01:08', 96, 3.4, 1.3, 24, 'Timed contrast-enhanced angiographic volume.', 0, 20),
  vesselWall: sequence('High-Resolution Vessel Wall SET', '01:22', 80, 920, 16, 90, 'Pre- and post-contrast small-field vessel-wall imaging.', 0, 42),
  runOff: sequence('Multi-Station Peripheral MRA', '01:24', 144, 3.5, 1.4, 24, 'Multi-station contrast-enhanced peripheral angiography.', 0, 22),

  wholeBodyDwi: sequence('Whole-Body Diffusion Multi-Station', '01:28', 120, 6200, 72, 90, 'Multi-station diffusion-weighted survey.', 0, 30),
  wholeBodyT1: sequence('Whole-Body T1 Chemical-Shift COR', '01:18', 96, 140, 2.4, 70, 'Multi-station coronal T1 chemical-shift survey.', 0, 24),
  fetalOverview: sequence('Fetal T2 Single-Shot 3-Plane', '00:58', 48, 1200, 90, 120, 'Rapid multiplanar fetal overview.', 0, 34),
  fetalBrain: sequence('Fetal Brain T2 Thin-Slice', '01:04', 54, 1400, 92, 120, 'Thin-slice orthogonal fetal brain imaging.', 0, 36),
} as const;

function group(
  name: string,
  description: string,
  recipe: SequenceKey[],
  protocols: string[],
  options: Omit<GroupDefinition, 'name' | 'description' | 'recipe' | 'protocols'> = {},
): GroupDefinition {
  return { name, description, recipe, protocols, ...options };
}

const CATEGORY_DEFINITIONS: CategoryDefinition[] = [
  {
    id: 'neuro-head', name: 'Neuro & Head', icon: '◉', description: 'Brain, cranial nerve, CSF, neurovascular, and focused intracranial studies.',
    groups: [
      group('Core Brain', 'General structural brain examination.', ['localizer','t1Sag','t2Ax','flairAx','dwiBrain','swi'], ['Routine Brain','Rapid Brain','Brain Screening','Headache Survey','Cognitive Change','Hydrocephalus Follow-up']),
      group('Acute & Trauma', 'Time-conscious brain assessment with diffusion and blood-product sensitivity.', ['localizer','dwiBrain','flairAx','swi','tofHead'], ['Acute Stroke','Transient Neurologic Symptoms','Brain Trauma','Suspected Hemorrhage','Hypoxic Injury','Emergency Brain']),
      group('Inflammation & Seizure', 'Expanded lesion-sensitive neuro examination.', ['localizer','t1Volume','t2Ax','flair3d','dwiBrain','swi','postBrain'], ['Demyelinating Disease','Seizure Focus','Encephalitis','Autoimmune Brain','Infection Follow-up'], { contrast:'Contrast optional' }),
      group('Oncology & Focused', 'High-detail pre/post-contrast intracranial assessment.', ['localizer','t1Volume','t2Ax','flair3d','dwiBrain','swi','perfusionBrain','postBrain'], ['Primary Brain Tumor','Metastatic Brain Survey','Post-Treatment Brain','Pituitary and Sella','Internal Auditory Canals','Cranial Nerve Survey'], { contrast:'With contrast' }),
      group('Flow & Advanced', 'Specialized neurovascular and physiologic imaging.', ['localizer','t1Volume','tofHead','mrVeno','csfFlow'], ['Intracranial Arterial Survey','Cerebral Venography','CSF Flow Study','Preoperative Mapping','Neuro Spectroscopy','Diffusion Tensor Planning'], { tags:['advanced'] }),
    ],
  },
  {
    id: 'spine', name: 'Spine & Cord', icon: '│', description: 'Regional and whole-spine protocols for degenerative, traumatic, inflammatory, and oncologic indications.',
    groups: [
      group('Cervical', 'Cervical spine and cord assessment.', ['localizer','spineT2Sag','spineT1Sag','spineStir','spineAx'], ['Cervical Routine','Cervical Radiculopathy','Cervical Myelopathy','Cervical Trauma','Cervical Postoperative','Cervical Cord Lesion']),
      group('Thoracic', 'Thoracic spine and cord assessment.', ['localizer','spineT2Sag','spineT1Sag','spineStir','spineAx'], ['Thoracic Routine','Thoracic Myelopathy','Thoracic Trauma','Thoracic Cord Lesion','Thoracic Infection']),
      group('Lumbar & Sacral', 'Lumbar, sacral, and nerve-root assessment.', ['localizer','spineT2Sag','spineT1Sag','spineStir','spineAx'], ['Lumbar Routine','Lumbar Radiculopathy','Lumbar Stenosis','Lumbar Postoperative','Sacrum and Coccyx','Sacral Plexus']),
      group('Extended Coverage', 'Multi-region or contrast-enhanced spine assessment.', ['localizer','spineT2Sag','spineT1Sag','spineStir','myelo3d','spinePost'], ['Whole Spine Survey','Spinal Metastatic Survey','Spinal Infection Survey','Leptomeningeal Survey','MR Myelographic Study'], { contrast:'Contrast optional' }),
    ],
  },
  {
    id: 'head-neck', name: 'Head & Neck', icon: '◇', description: 'Orbits, face, skull base, airway, salivary glands, and neck soft tissues.',
    groups: [
      group('Orbit & Face', 'Small-field orbital and facial soft-tissue imaging.', ['localizer','t1Cor','t2FsAx','t2FsCor','dwiBrain','postSoftTissue'], ['Orbits Routine','Vision Loss','Orbital Mass','Optic Nerve Inflammation','Face and Sinuses','Facial Nerve']),
      group('Skull Base & Temporal Bone', 'Focused skull-base and temporal-region assessment.', ['localizer','t1Volume','t2Ax','t2FsCor','dwiBrain','postSoftTissue'], ['Skull Base','Temporal Bone Soft Tissue','Cranial Neuropathy','Cerebellopontine Angle']),
      group('Neck Soft Tissue', 'Upper aerodigestive and glandular neck assessment.', ['localizer','t1Ax','t2FsAx','t2FsCor','dwiBody','postSoftTissue'], ['Neck Mass','Nasopharynx','Oropharynx','Larynx and Hypopharynx','Thyroid Region','Salivary Glands','Parotid Focus','Brachial Plexus']),
      group('Joints', 'Temporomandibular joint morphology and motion.', ['localizer','pdFsSag','pdFsCor','t1Msk'], ['TMJ Bilateral','TMJ Dynamic Open-Close']),
    ],
  },
  {
    id: 'msk-upper', name: 'MSK — Upper Limb', icon: '⌁', description: 'Shoulder through fingers, including sports, tendon, marrow, and arthrographic studies.',
    groups: [
      group('Shoulder', 'Rotator cuff, labral, cartilage, and marrow assessment.', ['localizer','pdFsCor','pdFsSag','pdFsAx','t1Msk'], ['Shoulder Routine','Rotator Cuff','Instability and Labrum','Shoulder Arthritis','Shoulder Mass']),
      group('Elbow', 'Ligament, tendon, cartilage, and nerve assessment.', ['localizer','pdFsCor','pdFsSag','pdFsAx','t1Msk'], ['Elbow Routine','Ulnar Collateral Ligament','Distal Biceps','Ulnar Nerve','Elbow Mass']),
      group('Wrist & Hand', 'Small-joint, ligament, tendon, and marrow assessment.', ['localizer','pdFsCor','pdFsSag','pdFsAx','t1Msk'], ['Wrist Routine','Scaphoid Injury','Triangular Fibrocartilage','Hand Routine','Finger or Thumb','Inflammatory Arthropathy']),
      group('Special Studies', 'Contrast, arthrographic, or implant-focused upper-limb imaging.', ['localizer','arthroT1','t2FsCor','t2FsAx'], ['Shoulder Arthrogram','Wrist Arthrogram','Postoperative Upper Limb','Upper-Limb Metal Implant'], { contrast:'Contrast optional' }),
    ],
  },
  {
    id: 'msk-lower', name: 'MSK — Lower Limb', icon: '⌄', description: 'Hip through toes, including sports, cartilage, marrow, nerve, and implant studies.',
    groups: [
      group('Hip & Pelvic Bone', 'Hip joint, tendons, labrum, marrow, and pelvic bone.', ['localizer','t1Msk','pdFsCor','pdFsSag','pdFsAx'], ['Hip Routine','Hip Labrum','Femoroacetabular Impingement','Avascular Necrosis','Athletic Pubalgia','Pelvic Bone Mass']),
      group('Knee', 'Menisci, ligaments, cartilage, extensor mechanism, and marrow.', ['localizer','pdFsSag','pdFsCor','pdFsAx','t1Msk'], ['Knee Routine','Meniscal Injury','Cruciate Ligaments','Collateral Ligaments','Patellofemoral Joint','Cartilage Mapping','Knee Mass']),
      group('Ankle & Foot', 'Ligament, tendon, plantar, cartilage, and marrow assessment.', ['localizer','pdFsSag','pdFsCor','pdFsAx','t1Msk'], ['Ankle Routine','Lateral Ligaments','Achilles Tendon','Foot Routine','Forefoot and Toes','Plantar Fascia','Diabetic Foot','Stress Injury']),
      group('Long Bone & Nerve', 'Large-field soft-tissue, marrow, and peripheral nerve assessment.', ['localizer','t1Msk','t2FsAx','t2FsCor','postSoftTissue'], ['Thigh','Lower Leg','Sciatic Nerve','Femoral Nerve','Soft-Tissue Mass'], { contrast:'Contrast optional' }),
      group('Special Studies', 'Arthrographic, postoperative, and implant-focused lower-limb imaging.', ['localizer','arthroT1','t2FsCor','metalReduce'], ['Hip Arthrogram','Postoperative Knee','Hip Implant','Knee Implant','Ankle Implant'], { contrast:'Contrast optional' }),
    ],
  },
  {
    id: 'abdomen', name: 'Abdomen', icon: '▱', description: 'Liver, biliary, pancreas, renal, adrenal, bowel, and abdominal wall protocols.',
    groups: [
      group('Liver & Biliary', 'Multiparametric hepatobiliary assessment.', ['localizer','t2SingleShotCor','t2BodyFs','chemicalShift','dwiBody','dceBody','delayedBody'], ['Liver Routine','Liver Lesion Characterization','Chronic Liver Disease','Post-Treatment Liver','Biliary Obstruction','Liver Donor Assessment'], { contrast:'Contrast optional' }),
      group('Pancreas & Ducts', 'Pancreatic parenchyma and ductal system assessment.', ['localizer','t2SingleShotCor','t2BodyFs','chemicalShift','dwiBody','mrcp','dceBody'], ['Pancreas Routine','Pancreatic Mass','Acute Pancreatitis','Chronic Pancreatitis','MR Cholangiopancreatography','Secretin-Style Duct Survey'], { contrast:'Contrast optional' }),
      group('Renal & Adrenal', 'Renal parenchyma, collecting system, and adrenal assessment.', ['localizer','t2SingleShotCor','t2BodyAx','chemicalShift','dwiBody','dceBody','urography'], ['Renal Mass','Adrenal Mass','MR Urography','Polycystic Kidney Survey','Renal Donor Assessment','Urinary Obstruction'], { contrast:'Contrast optional' }),
      group('Bowel & General', 'Bowel, peritoneal, and abdominal soft-tissue assessment.', ['localizer','t2SingleShotCor','t2BodyFs','dwiBody','enterography','dceBody'], ['MR Enterography','Small Bowel Inflammation','Appendix Problem-Solving','Peritoneal Disease','Abdominal Wall Mass','General Abdomen Survey'], { contrast:'Contrast optional' }),
      group('Quantitative', 'Educational tissue-composition acquisitions.', ['localizer','chemicalShift','t2BodyAx','dwiBody'], ['Liver Fat Estimate','Liver Iron Estimate','Abdominal Composition Research'], { tags:['quantitative','research'] }),
    ],
  },
  {
    id: 'pelvis', name: 'Pelvis', icon: '⬡', description: 'Female and male pelvis, rectum, bladder, pelvic floor, and perianal studies.',
    groups: [
      group('Female Pelvis', 'Uterine, adnexal, and pelvic soft-tissue assessment.', ['localizer','t2Sag','pelvicT2HiRes','t1Ax','dwiBody','dynamicPelvis'], ['Female Pelvis Routine','Uterine Mass','Adnexal Mass','Endometriosis','Cervical Malignancy','Post-Treatment Gynecologic'], { contrast:'Contrast optional' }),
      group('Male Pelvis', 'Prostate and male pelvic soft-tissue assessment.', ['localizer','t2Sag','pelvicT2HiRes','dwiBody','dynamicPelvis'], ['Prostate Multiparametric','Prostate Post-Treatment','Male Pelvis Routine','Testicular Problem-Solving'], { contrast:'Contrast optional' }),
      group('Rectal & Perianal', 'High-resolution rectal and perianal anatomy.', ['localizer','t2Sag','pelvicT2HiRes','dwiBody','dynamicPelvis'], ['Rectal Staging','Rectal Restaging','Perianal Fistula','Anal Canal Mass'], { contrast:'Contrast optional' }),
      group('Urinary & Functional', 'Bladder, urethral, and pelvic floor assessment.', ['localizer','t2Sag','pelvicT2HiRes','dwiBody','dynamicPelvis'], ['Bladder Mass','Female Urethra','Male Urethra','Pelvic Floor Dynamic','Placenta Follow-up Pelvis'], { contrast:'Contrast optional' }),
    ],
  },
  {
    id: 'breast', name: 'Breast', icon: '◒', description: 'Bilateral diagnostic, screening, implant, and treatment-response breast MRI.',
    groups: [
      group('Dynamic Breast', 'Bilateral dynamic contrast-enhanced breast assessment.', ['localizer','breastT2','breastDwi','breastDynamic'], ['High-Risk Screening','Known Malignancy Staging','Extent of Disease','Problem-Solving Breast','Neoadjuvant Response','Post-Treatment Breast'], { contrast:'With contrast' }),
      group('Implants', 'Implant integrity and surrounding tissue assessment.', ['localizer','breastT2','silicone'], ['Implant Integrity','Implant and Contrast Combined'], { contrast:'Contrast optional' }),
    ],
  },
  {
    id: 'chest', name: 'Chest & Thorax', icon: '▥', description: 'Mediastinum, chest wall, thoracic outlet, pleura, and selected lung indications.',
    groups: [
      group('Thoracic Soft Tissue', 'Thoracic soft-tissue and mediastinal assessment.', ['localizer','t2SingleShotCor','blackBlood','t2BodyFs','dwiBody','dceBody'], ['Mediastinal Mass','Chest Wall Mass','Pleural Disease','Selected Lung MRI','Diaphragm Motion','Thoracic Infection'], { contrast:'Contrast optional' }),
      group('Outlet & Plexus', 'Thoracic outlet and brachial plexus assessment.', ['localizer','t1Cor','t2FsCor','t2FsAx','postSoftTissue'], ['Thoracic Outlet','Brachial Plexus Extended','Apical Chest Mass'], { contrast:'Contrast optional' }),
    ],
  },
  {
    id: 'cardiac', name: 'Cardiovascular', icon: '♥', description: 'Cardiac structure, function, flow, tissue characterization, ischemia, and congenital assessment.',
    groups: [
      group('Core Cardiac', 'Chamber anatomy, ventricular function, and flow.', ['localizer','blackBlood','cardiacCine','cardiacFlow'], ['Cardiac Structure and Function','Cardiomyopathy Baseline','Valvular Function','Ventricular Volumes','Pericardial Assessment']),
      group('Tissue Characterization', 'Myocardial edema, mapping, and enhancement assessment.', ['localizer','blackBlood','cardiacCine','cardiacMaps','cardiacLge'], ['Myocarditis','Infiltrative Cardiomyopathy','Myocardial Viability','Cardiac Mass','Cardiac Iron Assessment'], { contrast:'Contrast optional' }),
      group('Ischemia', 'Perfusion, function, and late-enhancement assessment.', ['localizer','cardiacCine','cardiacPerfusion','cardiacLge'], ['Stress Perfusion','Ischemic Heart Disease','Infarct Follow-up'], { contrast:'With contrast' }),
      group('Congenital & Great Vessels', 'Flow and anatomy for congenital and great-vessel assessment.', ['localizer','blackBlood','cardiacCine','cardiacFlow','cardiacAngio'], ['Congenital Heart Overview','Shunt and Flow Quantification','Pulmonary Veins','Aortic Valve and Root','Cardiac Device Conditional'], { contrast:'Contrast optional' }),
    ],
  },
  {
    id: 'vascular', name: 'Vascular & Angiography', icon: '⇅', description: 'Arterial and venous studies from intracranial circulation through peripheral runoff.',
    groups: [
      group('Head & Neck Vessels', 'Intracranial and cervical arterial or venous assessment.', ['localizer','tofHead','mrVeno','vesselWall'], ['Intracranial Arteries','Carotid Non-Contrast','Arch and Carotid Contrast','Cerebral Venography','Intracranial Vessel Wall'], { contrast:'Contrast optional' }),
      group('Aorta & Visceral', 'Aortic and branch-vessel angiographic assessment.', ['localizer','blackBlood','mraContrast','cardiacFlow'], ['Thoracic Aorta','Abdominal Aorta','Aortic Dissection Follow-up','Renal Arteries','Mesenteric Arteries','Portal and Hepatic Veins'], { contrast:'Contrast optional' }),
      group('Peripheral', 'Upper- or lower-extremity vascular assessment.', ['localizer','mraNonContrast','mraContrast','runOff'], ['Pelvis and Lower-Limb Runoff','Calf and Foot Arteries','Upper-Extremity Arteries','Peripheral Venography','Dialysis Access'], { contrast:'Contrast optional' }),
    ],
  },
  {
    id: 'pediatric', name: 'Pediatric', icon: '✦', description: 'Age-aware educational protocols with rapid and focused options for infants and children.',
    groups: [
      group('Pediatric Neuro', 'Age-aware brain imaging with rapid options.', ['localizer','t1Volume','t2Ax','flairAx','dwiBrain','swi'], ['Neonatal Brain','Infant Brain','Child Brain Routine','Pediatric Rapid Brain','Pediatric Stroke','Pediatric Seizure','Pediatric Brain Tumor'], { population:'Pediatric', contrast:'Contrast optional' }),
      group('Pediatric Spine & MSK', 'Focused pediatric spine and musculoskeletal assessment.', ['localizer','spineT2Sag','spineT1Sag','spineStir','spineAx'], ['Pediatric Cervical Spine','Pediatric Whole Spine','Pediatric Cord Lesion','Pediatric Joint','Pediatric Long Bone','Pediatric Sports Injury'], { population:'Pediatric', contrast:'Contrast optional' }),
      group('Pediatric Body', 'Rapid, age-aware body imaging.', ['localizer','t2SingleShotCor','t2BodyFs','dwiBody','dceBody'], ['Pediatric Abdomen','Pediatric Liver Dynamic','Pediatric Pelvis','Pediatric Renal','Pediatric Enterography','Pediatric Whole-Body Survey'], { population:'Pediatric', contrast:'Contrast optional' }),
      group('Non-Sedation Options', 'Short educational exam sets intended to support motion-aware workflows.', ['localizer','t2SingleShotCor','dwiBrain'], ['Fast Neuro Under 5 Minutes','Fast Body Under 5 Minutes','Motion-Limited Rescue Set'], { population:'Pediatric', tags:['rapid'] }),
    ],
  },
  {
    id: 'oncology-whole-body', name: 'Oncology & Whole Body', icon: '⌗', description: 'Multi-station cancer, marrow, treatment-response, and systemic disease surveys.',
    groups: [
      group('Whole-Body Oncology', 'Multi-station diffusion and anatomic survey.', ['localizer','wholeBodyT1','wholeBodyDwi','dwiBody'], ['Whole-Body Oncology','Metastatic Survey','Lymphoma Survey','Multiple Myeloma','Marrow Disease','Treatment Response']),
      group('Regional Oncology', 'Focused regional staging and surveillance.', ['localizer','t1Msk','t2FsAx','dwiBody','postSoftTissue'], ['Soft-Tissue Tumor Staging','Bone Tumor Staging','Postoperative Tumor Bed','Radiation Follow-up'], { contrast:'Contrast optional' }),
    ],
  },
  {
    id: 'fetal-pregnancy', name: 'Fetal & Pregnancy', icon: '○', description: 'Rapid fetal and pregnancy-related educational imaging without routine contrast.',
    groups: [
      group('Fetal', 'Motion-robust multiplanar fetal assessment.', ['localizer','fetalOverview','fetalBrain'], ['Fetal Brain','Fetal Body','Fetal Spine','Multiple Gestation'], { population:'Fetal' }),
      group('Pregnancy', 'Focused maternal and placental assessment.', ['localizer','t2SingleShotCor','t2BodyAx','dwiBody'], ['Placental Assessment','Maternal Appendix Problem-Solving','Maternal Abdominal Pain'], { population:'Fetal' }),
    ],
  },
  {
    id: 'advanced-research', name: 'Advanced & Research', icon: '∿', description: 'Educational quantitative, functional, microstructural, spectroscopy, and method-development sets.',
    groups: [
      group('Neuro Advanced', 'Research-oriented neuro acquisition sets.', ['localizer','t1Volume','dti','bold','spectroscopy','perfusionBrain'], ['Diffusion Tensor Research','Functional BOLD Mapping','Neuro Spectroscopy','Brain Perfusion Research','Connectome Source Set'], { tags:['research','advanced'] }),
      group('Quantitative Imaging', 'Educational quantitative-style source acquisitions.', ['localizer','t1Volume','cardiacMaps','dwiBody'], ['T1 Mapping Research','T2 Mapping Research','Diffusion Quantification','Fat Fraction Research','Iron Quantification Research'], { tags:['research','quantitative'] }),
      group('Flow & Motion', 'Velocity and dynamic motion research sets.', ['localizer','csfFlow','cardiacFlow','cardiacCine'], ['4D-Flow Style Research','CSF Dynamics Research','Joint Motion Research','Real-Time Motion Study'], { tags:['research','advanced'] }),
      group('Development', 'Non-clinical sequence testing and quality workflows.', ['localizer','t1Volume','t2Ax','dwiBrain'], ['Sequence Development Sandbox','Phantom Quality Review','Coil Uniformity Review','Geometry Validation'], { tags:['research','non-clinical'] }),
    ],
  },
];

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function secondsFromTime(value: string): number {
  const [minutes = 0, seconds = 0] = value.split(':').map(Number);
  return minutes * 60 + seconds;
}

function formatTotalTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function inferContrast(name: string, fallback: ProtocolContrast): ProtocolContrast {
  const normalized = name.toLowerCase();
  if (normalized.includes('contrast') || normalized.includes('dynamic') || normalized.includes('staging')) return 'With contrast';
  return fallback;
}

export const PROTOCOL_CATEGORIES: ProtocolCategory[] = CATEGORY_DEFINITIONS.map(category => ({
  id: category.id,
  name: category.name,
  icon: category.icon,
  description: category.description,
  protocols: category.groups.flatMap(groupDef => groupDef.protocols.map(name => {
    const sequences = groupDef.recipe.map(key => ({ ...SEQUENCE_LIBRARY[key] }));
    return {
      id: `${category.id}-${slugify(name)}`,
      categoryId: category.id,
      categoryName: category.name,
      categoryIcon: category.icon,
      group: groupDef.name,
      name,
      description: groupDef.description,
      contrast: inferContrast(name, groupDef.contrast ?? 'Non-contrast'),
      population: groupDef.population ?? 'Adult',
      tags: [category.name, groupDef.name, ...(groupDef.tags ?? [])],
      estimatedTime: formatTotalTime(sequences.reduce((sum, item) => sum + secondsFromTime(item.ta), 0)),
      sequences,
    } satisfies ProtocolPreset;
  })),
}));

export const ALL_PROTOCOLS = PROTOCOL_CATEGORIES.flatMap(category => category.protocols);
export const PROTOCOL_COUNT = ALL_PROTOCOLS.length;
export const PROTOCOL_CATEGORY_COUNT = PROTOCOL_CATEGORIES.length;

export function findProtocol(protocolId: string): ProtocolPreset | undefined {
  return ALL_PROTOCOLS.find(protocol => protocol.id === protocolId);
}

export function materializeProtocolSequences(protocol: ProtocolPreset): Sequence[] {
  return protocol.sequences.map((item, index) => ({
    ...item,
    id: 1000 + index,
    status: index === 0 ? 'active' : 'pending',
  }));
}

export function protocolMatches(protocol: ProtocolPreset, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return [
    protocol.name,
    protocol.categoryName,
    protocol.group,
    protocol.description,
    protocol.contrast,
    protocol.population,
    ...protocol.tags,
    ...protocol.sequences.map(item => item.name),
  ].some(value => value.toLowerCase().includes(normalized));
}
