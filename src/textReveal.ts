import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { CustomEase } from 'gsap/CustomEase';
import { BLUR, CHAR_STAGGER, DISTANCE, EASE } from './config.ts';

gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase);
CustomEase.create('settle', EASE);

const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const activeCleanups: Array<() => void> = [];

export interface RevealTextOptions {
  mode?: 'chars' | 'lines' | 'auto';
  timeline?: gsap.core.Timeline;
  position?: number | string;
  scrollTrigger?: boolean | ScrollTrigger.Vars;
  delay?: number;
  duration?: number;
}

export function revealText(
  el: Element | null,
  options: RevealTextOptions = {}
): () => void {
  if (!el || prefersReducedMotion) return () => {};

  const htmlEl = el as HTMLElement;
  const textLen = (htmlEl.textContent || '').trim().length;
  const useLines =
    options.mode === 'lines' ||
    (options.mode !== 'chars' && textLen > 120);

  let currentTl: gsap.core.Timeline | null = null;
  let splitInstance: SplitText | null = null;

  const buildAnimation = (self: SplitText) => {
    if (currentTl && !options.timeline) {
      currentTl.scrollTrigger?.kill();
      currentTl.kill();
      currentTl = null;
    }

    const targets = useLines ? self.lines : self.chars;
    if (!targets || targets.length === 0) return;

    const dur = options.duration ?? (useLines ? 0.7 : 0.6);
    const tl = options.timeline
      ? options.timeline
      : options.scrollTrigger
        ? gsap.timeline({
            scrollTrigger: {
              trigger: htmlEl,
              start: 'top 85%',
              end: 'top 50%',
              scrub: true,
              ...(typeof options.scrollTrigger === 'object'
                ? options.scrollTrigger
                : {}),
            },
          })
        : gsap.timeline({ delay: options.delay ?? 0 });

    if (!options.timeline) {
      currentTl = tl;
    }

    const pos = options.timeline ? (options.position ?? 0) : 0;

    gsap.set(targets, { willChange: 'transform, opacity' });

    const clearWC = () => {
      gsap.set(targets, { clearProps: 'willChange' });
    };

    if (useLines) {
      tl.fromTo(
        targets,
        { yPercent: 100, opacity: 0 },
        {
          yPercent: 0,
          opacity: 1,
          duration: dur,
          stagger: 0.08,
          ease: 'settle',
          onComplete: clearWC,
          onReverseComplete: clearWC,
        },
        pos
      );
    } else {
      tl.fromTo(
        targets,
        { y: DISTANCE, opacity: 0, filter: `blur(${BLUR}px)` },
        {
          y: 0,
          opacity: 1,
          filter: 'blur(0px)',
          duration: dur,
          stagger: CHAR_STAGGER,
          ease: 'settle',
          onComplete: clearWC,
          onReverseComplete: clearWC,
        },
        pos
      );
    }

    tl.fromTo(
      htmlEl,
      { clipPath: 'inset(0 100% 0 0)' },
      {
        clipPath: 'inset(0 0% 0 0)',
        duration: dur,
        ease: 'settle',
      },
      pos
    );
  };

  splitInstance = SplitText.create(htmlEl, {
    type: 'chars,words,lines',
    mask: 'lines',
    autoSplit: true,
    onSplit(self) {
      buildAnimation(self);
    },
  });

  const cleanup = () => {
    if (currentTl) {
      currentTl.scrollTrigger?.kill();
      currentTl.kill();
      currentTl = null;
    }
    splitInstance?.revert();
    splitInstance = null;
  };

  activeCleanups.push(cleanup);
  return cleanup;
}

export function cleanupAllTextReveals(): void {
  while (activeCleanups.length > 0) {
    const fn = activeCleanups.pop();
    fn?.();
  }
}
