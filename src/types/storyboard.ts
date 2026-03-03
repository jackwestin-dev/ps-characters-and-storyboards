/**
 * One scene in a storyboard, formatted for OpenArt.ai.
 * OpenArt uses: "Storyboard style: [description]"
 */
export interface ScenePrompt {
  index: number;
  title: string;
  description: string;
  /** Ready to paste into OpenArt (Storyboard style: ...) */
  openArtPrompt: string;
}

/**
 * Full storyboard scene with video editor notes and text overlay notes.
 * Used by the textbook → storyboard agent and as input to the character agent.
 */
export interface StoryboardScene {
  index: number;
  /** e.g. "Scene 1: Calm context – positive emotional state" */
  title: string;
  /** Location, camera angle, lighting, environment */
  setting: string;
  /** Who's there, posture, expression, key objects */
  characterAndObjects: string;
  /** What the scene teaches or conveys emotionally */
  emotionalState: string;
  /** Video editor notes: camera, zoom, pan, subtle effects (e.g. "Subtle fire flicker only. No camera movement.") */
  animationNotes: string;
  /** Optional on-screen text / captions for the frame */
  textOverlayNotes?: string;
  /** Flattened description for OpenArt (setting + character + mood) */
  description?: string;
  openArtPrompt?: string;
}

export interface StoryboardOutput {
  /** Title/summary of the storyboard from the textbook */
  title: string;
  /** Opening scene - for OpenArt start image */
  startScene: ScenePrompt;
  /** Closing scene - for OpenArt end image */
  endScene: ScenePrompt;
  /** All suggested scenes in order (including start and end) */
  storyboardScenes: ScenePrompt[];
  /** Full scenes with video editor + text overlay notes (when using new format) */
  scenes?: StoryboardScene[];
  /** Optional character block to prepend to prompts for consistency */
  characterBlock?: string;
}

/** One before/after pair for OpenArt (e.g. calm → fear). Used when generating multiple options. */
export interface BeforeAfterPair {
  before: ScenePrompt;
  after: ScenePrompt;
  /** Optional label e.g. "Calm → Fear" */
  label?: string;
}

/** A single character option for the user to choose from within the scene. */
export interface CharacterOption {
  /** Short label e.g. "Young learner", "Teen protagonist" */
  label: string;
  /** Full character block to prepend to scene prompts */
  characterBlock: string;
}

/** Scene description without baked-in character (used with selected CharacterOption). */
export interface SceneDescription {
  title: string;
  description: string;
}
