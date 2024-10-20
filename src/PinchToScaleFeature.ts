import { CoordinateSystem } from '@rnacanvas/draw.svg';

import { clamp } from '@rnacanvas/math';

interface HorizontalScrollbar {
  thumb: {
    /**
     * The center X coordinate of the thumb of the horizontal scrollbar
     * (in the coordinate system of the horizontal scrollbar).
     *
     * The coordinate system of a horizontal scrollbar is the one used by
     * element properties such as `scrollLeft` and `scrollWidth`.
     *
     * Can be set to control the positioning of the horizontal scrollbar.
     */
    centerX: number;
  }
}

interface VerticalScrollbar {
  thumb: {
    /**
     * The center Y coordinate of the thumb of the vertical scrollbar
     * (in the coordinate system of the vertical scrollbar).
     *
     * The coordinate system of a vertical scrollbar is the one used by
     * element properties such as `scrollTop` and `scrollHeight`.
     *
     * Can be set to control the positioning of the vertical scrollbar.
     */
    centerY: number;
  }
}

/**
 * A pinch-to-scale feature for a target SVG document.
 *
 * Allows the user to scale the target SVG document by pinching with a laptop trackpad
 * or scrolling with a mouse.
 *
 * The target SVG document is scaled by modifying its `width` and `height` attributes.
 *
 * No other attributes of the target SVG document are modified.
 */
export class PinchToScaleFeature {
  /**
   * The horizontal scrollbar for the target SVG document.
   *
   * When defined, the center X coordinate of its thumb
   * will be maintained when pinching-to-scale.
   */
  public horizontalScrollbar?: HorizontalScrollbar;

  /**
   * The vertical scrollbar for the target SVG document.
   *
   * When defined, the center Y coordinate of its thumb
   * will be maintained when pinching-to-scale.
   */
  public verticalScrollbar?: VerticalScrollbar;

  #interactionScope?: Element;

  /**
   * To be called just before the target SVG document is scaled.
   */
  beforeScaling?: () => void;

  /**
   * To be called just after a scaling "action" by the user has completed.
   */
  afterScaling?: () => void;

  /**
   * The exact time that the target SVG document was last scaled.
   *
   * Is initialized to zero before the target SVG document has been scaled at all.
   */
  #timeOfLastScaling = 0;

  /**
   * The interval that calls the `afterScaling()` method (if defined).
   */
  #afterScalingInterval?: ReturnType<typeof setInterval>;

  /**
   * @param target The target SVG document.
   */
  constructor(public target: SVGSVGElement) {
    window.addEventListener('wheel', event => this.handleWheel(event), { passive: false });
  }

  /**
   * Wheel events that occur inside the interaction scope
   * (or whose target is the interaction scope)
   * will be responded to by the pinch-to-scale feature.
   *
   * Is the target SVG document by default.
   *
   * Note that when the interaction scope is not explicitly set
   * it will auto-update to always be the current target SVG document.
   *
   * However, the interaction scope will not auto-update when the target SVG document changes
   * if it has been explicitly set.
   */
  get interactionScope(): Element {
    return this.#interactionScope ?? this.target;
  }

  set interactionScope(interactionScope) {
    this.#interactionScope = interactionScope;
  }

  handleWheel(event: WheelEvent): void {
    if (!event.ctrlKey) { return; }

    if (!(event.target instanceof Node)) { return; }
    if (!this.interactionScope.contains(event.target)) { return; }

    event.preventDefault();

    if (!this.#afterScalingInterval) {
      this.beforeScaling ? this.beforeScaling() : {};
    }

    // delta-Y values can be really big when scrolling with a mouse
    let deltaY = clamp(event.deltaY, -25, 25);

    // the factor to change the scaling by
    // (dividing by 150 feels good in testing)
    let changeFactor = 1 - (deltaY / 150);

    let targetCoordinateSystem = new CoordinateSystem(this.target);

    // this assumes that the horizontal and vertical scaling factors are the same
    let currentScaling = targetCoordinateSystem.horizontalScaling;

    let newScaling = changeFactor * currentScaling;

    // ensure that the new scaling factor is a reasonable value
    newScaling = Number.isFinite(newScaling) ? newScaling : 1;
    newScaling = clamp(newScaling, 1e-2, 500);

    // account for any clamping of the new scaling factor
    changeFactor = newScaling / currentScaling;

    // calculate new scroll positions
    let newScrollCenterX = changeFactor * (this.horizontalScrollbar?.thumb.centerX ?? 0);
    let newScrollCenterY = changeFactor * (this.verticalScrollbar?.thumb.centerY ?? 0);

    targetCoordinateSystem.setScaling(newScaling);

    this.horizontalScrollbar ? this.horizontalScrollbar.thumb.centerX = newScrollCenterX : {};
    this.verticalScrollbar ? this.verticalScrollbar.thumb.centerY = newScrollCenterY : {};

    this.#timeOfLastScaling = Date.now();

    if (!this.#afterScalingInterval) {
      this.#afterScalingInterval = setInterval(() => {
        if (Date.now() - this.#timeOfLastScaling >= 500) {
          this.afterScaling ? this.afterScaling() : {};
          clearInterval(this.#afterScalingInterval);
          this.#afterScalingInterval = undefined;
        }
      }, 50);
    }
  }
}
