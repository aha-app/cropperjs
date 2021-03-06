import {
  ACTION_ALL,
  ACTION_CROP,
  ACTION_EAST,
  ACTION_MOVE,
  ACTION_NORTH,
  ACTION_NORTH_EAST,
  ACTION_NORTH_WEST,
  ACTION_SOUTH,
  ACTION_SOUTH_EAST,
  ACTION_SOUTH_WEST,
  ACTION_WEST,
  ACTION_ZOOM,
  CLASS_HIDDEN,
} from './constants';
import {
  forEach, getMaxZoomRatio, getOffset, removeClass,
} from './utilities';

export default {
  change(event) {
    const {
      options, canvasData, containerData, cropBoxData, pointers,
    } = this;
    let { action } = this;
    let { aspectRatio } = options;
    let {
      left, top, width, height,
    } = cropBoxData;
    const right = left + width;
    const bottom = top + height;
    let minLeft = 0;
    let minTop = 0;
    let maxWidth = containerData.width;
    let maxHeight = containerData.height;
    let renderable = true;
    let offset;

    // Locking aspect ratio in "free mode" by holding shift key
    if (!aspectRatio && event.shiftKey) {
      aspectRatio = width && height ? width / height : 1;
    }

    const { theta = 0, transformScale = 1 } = options;

    if (this.limited) {
      ({ minLeft, minTop } = cropBoxData);
      maxWidth = minLeft
        + Math.min(
          containerData.width,
          canvasData.width,
          canvasData.left + canvasData.width,
        );
      maxHeight = minTop
        + Math.min(
          containerData.height,
          canvasData.height,
          canvasData.top + canvasData.height,
        );
    }

    const pointer = pointers[Object.keys(pointers)[0]];
    let range;

    const trueTheta = theta < 0 ? 360 + theta : theta;

    const direction = Math.trunc(Math.trunc(trueTheta) / 90) % 4;
    if (direction === 0) {
      range = {
        x: pointer.endX - pointer.startX,
        y: pointer.endY - pointer.startY,
      };
    } else if (direction === 1) {
      range = {
        y: pointer.startX - pointer.endX,
        x: pointer.endY - pointer.startY,
      };
    } else if (direction === 2) {
      range = {
        x: pointer.startX - pointer.endX,
        y: pointer.startY - pointer.endY,
      };
    } else if (direction === 3) {
      range = {
        y: pointer.endX - pointer.startX,
        x: pointer.startY - pointer.endY,
      };
    }

    const check = (side) => {
      switch (side) {
        case ACTION_EAST:
          if (right + range.x > maxWidth) {
            range.x = maxWidth - right;
          }

          break;

        case ACTION_WEST:
          if (left + range.x < minLeft) {
            range.x = minLeft - left;
          }

          break;

        case ACTION_NORTH:
          if (top + range.y < minTop) {
            range.y = minTop - top;
          }

          break;

        case ACTION_SOUTH:
          if (bottom + range.y > maxHeight) {
            range.y = maxHeight - bottom;
          }

          break;

        default:
      }
    };

    switch (action) {
      // Move crop box
      case ACTION_ALL:
        left += range.x / transformScale;
        top += range.y / transformScale;
        break;

      // Resize crop box
      case ACTION_EAST:
        if (
          range.x >= 0
          && (right >= maxWidth
            || (aspectRatio && (top <= minTop || bottom >= maxHeight)))
        ) {
          renderable = false;
          break;
        }

        check(ACTION_EAST);
        width += range.x / transformScale;

        if (width < 0) {
          action = ACTION_WEST;
          width = -width;
          left -= width;
        }

        if (aspectRatio) {
          height = width / aspectRatio;
          top += (cropBoxData.height - height) / 2;
        }

        break;

      case ACTION_NORTH:
        if (
          range.y <= 0
          && (top <= minTop
            || (aspectRatio && (left <= minLeft || right >= maxWidth)))
        ) {
          renderable = false;
          break;
        }

        check(ACTION_NORTH);
        height -= range.y / transformScale;
        top += range.y / transformScale;

        if (height < 0) {
          action = ACTION_SOUTH;
          height = -height;
          top -= height;
        }

        if (aspectRatio) {
          width = height * aspectRatio;
          left += (cropBoxData.width - width) / 2;
        }

        break;

      case ACTION_WEST:
        if (
          range.x <= 0
          && (left <= minLeft
            || (aspectRatio && (top <= minTop || bottom >= maxHeight)))
        ) {
          renderable = false;
          break;
        }

        check(ACTION_WEST);
        width -= range.x / transformScale;
        left += range.x / transformScale;

        if (width < 0) {
          action = ACTION_EAST;
          width = -width;
          left -= width;
        }

        if (aspectRatio) {
          height = width / aspectRatio;
          top += (cropBoxData.height - height) / 2;
        }

        break;

      case ACTION_SOUTH:
        if (
          range.y >= 0
          && (bottom >= maxHeight
            || (aspectRatio && (left <= minLeft || right >= maxWidth)))
        ) {
          renderable = false;
          break;
        }

        check(ACTION_SOUTH);
        height += range.y / transformScale;

        if (height < 0) {
          action = ACTION_NORTH;
          height = -height;
          top -= height;
        }

        if (aspectRatio) {
          width = height * aspectRatio;
          left += (cropBoxData.width - width) / 2;
        }

        break;

      case ACTION_NORTH_EAST:
        if (aspectRatio) {
          if (range.y <= 0 && (top <= minTop || right >= maxWidth)) {
            renderable = false;
            break;
          }

          check(ACTION_NORTH);
          height -= range.y / transformScale;
          top += range.y / transformScale;
          width = height * aspectRatio;
        } else {
          check(ACTION_NORTH);
          check(ACTION_EAST);

          if (range.x >= 0) {
            if (right < maxWidth) {
              width += range.x / transformScale;
            } else if (range.y <= 0 && top <= minTop) {
              renderable = false;
            }
          } else {
            width += range.x / transformScale;
          }

          if (range.y <= 0) {
            if (top > minTop) {
              height -= range.y / transformScale;
              top += range.y / transformScale;
            }
          } else {
            height -= range.y / transformScale;
            top += range.y / transformScale;
          }
        }

        if (width < 0 && height < 0) {
          action = ACTION_SOUTH_WEST;
          height = -height;
          width = -width;
          top -= height;
          left -= width;
        } else if (width < 0) {
          action = ACTION_NORTH_WEST;
          width = -width;
          left -= width;
        } else if (height < 0) {
          action = ACTION_SOUTH_EAST;
          height = -height;
          top -= height;
        }

        break;

      case ACTION_NORTH_WEST:
        if (aspectRatio) {
          if (range.y <= 0 && (top <= minTop || left <= minLeft)) {
            renderable = false;
            break;
          }

          check(ACTION_NORTH);
          height -= range.y / transformScale;
          top += range.y / transformScale;
          width = height * aspectRatio;
          left += cropBoxData.width - width;
        } else {
          check(ACTION_NORTH);
          check(ACTION_WEST);

          if (range.x <= 0) {
            if (left > minLeft) {
              width -= range.x / transformScale;
              left += range.x / transformScale;
            } else if (range.y <= 0 && top <= minTop) {
              renderable = false;
            }
          } else {
            width -= range.x / transformScale;
            left += range.x / transformScale;
          }

          if (range.y <= 0) {
            if (top > minTop) {
              height -= range.y / transformScale;
              top += range.y / transformScale;
            }
          } else {
            height -= range.y / transformScale;
            top += range.y / transformScale;
          }
        }

        if (width < 0 && height < 0) {
          action = ACTION_SOUTH_EAST;
          height = -height;
          width = -width;
          top -= height;
          left -= width;
        } else if (width < 0) {
          action = ACTION_NORTH_EAST;
          width = -width;
          left -= width;
        } else if (height < 0) {
          action = ACTION_SOUTH_WEST;
          height = -height;
          top -= height;
        }

        break;

      case ACTION_SOUTH_WEST:
        if (aspectRatio) {
          if (range.x <= 0 && (left <= minLeft || bottom >= maxHeight)) {
            renderable = false;
            break;
          }

          check(ACTION_WEST);
          width -= range.x / transformScale;
          left += range.x / transformScale;
          height = width / aspectRatio;
        } else {
          check(ACTION_SOUTH);
          check(ACTION_WEST);

          if (range.x <= 0) {
            if (left > minLeft) {
              width -= range.x / transformScale;
              left += range.x / transformScale;
            } else if (range.y >= 0 && bottom >= maxHeight) {
              renderable = false;
            }
          } else {
            width -= range.x / transformScale;
            left += range.x / transformScale;
          }

          if (range.y >= 0) {
            if (bottom < maxHeight) {
              height += range.y / transformScale;
            }
          } else {
            height += range.y / transformScale;
          }
        }

        if (width < 0 && height < 0) {
          action = ACTION_NORTH_EAST;
          height = -height;
          width = -width;
          top -= height;
          left -= width;
        } else if (width < 0) {
          action = ACTION_SOUTH_EAST;
          width = -width;
          left -= width;
        } else if (height < 0) {
          action = ACTION_NORTH_WEST;
          height = -height;
          top -= height;
        }

        break;

      case ACTION_SOUTH_EAST:
        if (aspectRatio) {
          if (range.x >= 0 && (right >= maxWidth || bottom >= maxHeight)) {
            renderable = false;
            break;
          }

          check(ACTION_EAST);
          width += range.x / transformScale;
          height = width / aspectRatio;
        } else {
          check(ACTION_SOUTH);
          check(ACTION_EAST);

          if (range.x >= 0) {
            if (right < maxWidth) {
              width += range.x / transformScale;
            } else if (range.y >= 0 && bottom >= maxHeight) {
              renderable = false;
            }
          } else {
            width += range.x / transformScale;
          }

          if (range.y >= 0) {
            if (bottom < maxHeight) {
              height += range.y / transformScale;
            }
          } else {
            height += range.y / transformScale;
          }
        }

        if (width < 0 && height < 0) {
          action = ACTION_NORTH_WEST;
          height = -height;
          width = -width;
          top -= height;
          left -= width;
        } else if (width < 0) {
          action = ACTION_SOUTH_WEST;
          width = -width;
          left -= width;
        } else if (height < 0) {
          action = ACTION_NORTH_EAST;
          height = -height;
          top -= height;
        }

        break;

      // Move canvas
      case ACTION_MOVE:
        this.move(range.x, range.y);
        renderable = false;
        break;

      // Zoom canvas
      case ACTION_ZOOM:
        this.zoom(getMaxZoomRatio(pointers), event);
        renderable = false;
        break;

      // Create crop box
      case ACTION_CROP:
        if (!range.x || !range.y) {
          renderable = false;
          break;
        }

        offset = getOffset(this.cropper);
        left = (pointer.startX - offset.left) / transformScale;
        top = (pointer.startY - offset.top) / transformScale;
        width = cropBoxData.minWidth;
        height = cropBoxData.minHeight;

        if (range.x > 0) {
          action = range.y > 0 ? ACTION_SOUTH_EAST : ACTION_NORTH_EAST;
        } else if (range.x < 0) {
          left -= width;
          action = range.y > 0 ? ACTION_SOUTH_WEST : ACTION_NORTH_WEST;
        }

        if (range.y < 0) {
          top -= height;
        }

        // Show the crop box if is hidden
        if (!this.cropped) {
          removeClass(this.cropBox, CLASS_HIDDEN);
          this.cropped = true;

          if (this.limited) {
            this.limitCropBox(true, true);
          }
        }

        break;

      default:
    }

    if (renderable) {
      cropBoxData.width = width;
      cropBoxData.height = height;
      cropBoxData.left = left;
      cropBoxData.top = top;
      this.action = action;
      this.renderCropBox();
    }

    // Override
    forEach(pointers, (p) => {
      p.startX = p.endX;
      p.startY = p.endY;
    });
  },
};
