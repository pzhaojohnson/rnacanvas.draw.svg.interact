import { CoordinateSystem as SVGDocCoordinateSystem } from '@rnacanvas/draw.svg';

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
  private readonly targetSVGDoc: SVGSVGElement;

  /**
   * The coordinate system of the target SVG document.
   */
  private readonly targetSVGDocCoordinateSystem: SVGDocCoordinateSystem;

  private readonly horizontalScrollbar: HorizontalScrollbar;
  private readonly verticalScrollbar: VerticalScrollbar;

  /**
   * Providing the horizontal and vertical scrollbars for the target SVG document
   * allows them to be kept centered on their original points in the target SVG document
   * while the user is pinching-to-scale.
   *
   * @param targetSVGDoc
   * @param horizontalScrollbar The horizontal scrollbar for the target SVG document.
   * @param verticalScrollbar The vertical scrollbar for the target SVG document.
   */
  constructor(targetSVGDoc: SVGSVGElement, horizontalScrollbar: HorizontalScrollbar, verticalScrollbar: VerticalScrollbar) {
    this.targetSVGDoc = targetSVGDoc;
    this.targetSVGDocCoordinateSystem = new SVGDocCoordinateSystem(targetSVGDoc);

    this.horizontalScrollbar = horizontalScrollbar;
    this.verticalScrollbar = verticalScrollbar;

    window.addEventListener('wheel', event => this.handleWheel(event), { passive: false });
  }

  handleWheel(event: WheelEvent): void {
    if (!event.ctrlKey) { return; }

    if (!(event.target instanceof Node)) { return; }
    if (!this.targetSVGDoc.contains(event.target)) { return; }

    event.preventDefault();

    // delta-Y values can be really big when scrolling with a mouse
    let deltaY = clamp(event.deltaY, -25, 25);

    // the factor to change the scaling by
    // (multiplying by 5 feels good when testing)
    let changeFactor = 1 - (5 * deltaY / this.targetSVGDoc.getBoundingClientRect().height);

    // this just assumes that the horizontal and vertical scalings are the same
    let scaling = changeFactor * this.targetSVGDocCoordinateSystem.horizontalScaling;

    // ensure that the new scaling factor is a reasonable value
    scaling = Number.isFinite(scaling) ? scaling : 1;
    scaling = clamp(scaling, 1e-2, 500);

    // calculate new scroll positions
    let scrollCenterX = changeFactor * this.horizontalScrollbar.thumb.centerX;
    let scrollCenterY = changeFactor * this.verticalScrollbar.thumb.centerY;

    this.targetSVGDocCoordinateSystem.setScaling(scaling);

    this.horizontalScrollbar.thumb.centerX = scrollCenterX;
    this.verticalScrollbar.thumb.centerY = scrollCenterY;
  }
}
