"use client";

import { Component, type ReactNode } from "react";
import { GlobeStatus } from "./GlobeStatus";

type Props = { children: ReactNode };
type State = { error: Error | null };

/** Catches failures inside the WebGL scene (most often: WebGL unavailable) so the page survives. */
export class GlobeErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("Globe failed to render", error);
  }

  render() {
    if (this.state.error) {
      return (
        <GlobeStatus
          kind="error"
          title="The 3D globe couldn’t start"
          detail="Your browser or device may not support WebGL, or it is turned off. Try another browser, or enable hardware acceleration."
        />
      );
    }
    return this.props.children;
  }
}
