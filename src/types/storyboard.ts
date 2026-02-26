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

export interface StoryboardOutput {
  /** Title/summary of the storyboard from the textbook */
  title: string;
  /** Opening scene - for OpenArt start image */
  startScene: ScenePrompt;
  /** Closing scene - for OpenArt end image */
  endScene: ScenePrompt;
  /** All suggested scenes in order (including start and end) */
  storyboardScenes: ScenePrompt[];
  /** Optional character block to prepend to prompts for consistency */
  characterBlock?: string;
}
