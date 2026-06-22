import assert from "node:assert/strict";
import test from "node:test";
import {
  getSelectedVendorCameraTarget,
  getVendorMapCenter,
  isSelectionCameraSource,
  SELECTED_VENDOR_CAMERA_ZOOM,
} from "../components/public/vendor-map-camera.ts";

test("vendor map centers use MapLibre longitude-latitude order", () => {
  assert.deepEqual(
    getVendorMapCenter({
      latitude: 9.0813,
      longitude: 7.4673,
    }),
    [7.4673, 9.0813],
  );
});

test("vendor map centers parse numeric coordinate strings before use", () => {
  assert.deepEqual(
    getVendorMapCenter({
      latitude: "9.0813",
      longitude: "7.4673",
    }),
    [7.4673, 9.0813],
  );
});

test("vendor map centers reject invalid coordinates", () => {
  assert.equal(getVendorMapCenter({ latitude: null, longitude: 7.4673 }), null);
  assert.equal(getVendorMapCenter({ latitude: 91, longitude: 7.4673 }), null);
  assert.equal(getVendorMapCenter({ latitude: 9.0813, longitude: 181 }), null);
  assert.equal(getVendorMapCenter({ latitude: "not-a-number", longitude: 7.4673 }), null);
});

test("selected vendor camera target is resolved by vendor ID, not list index", () => {
  const target = getSelectedVendorCameraTarget(
    [
      {
        vendor_id: "wuse-rice",
        latitude: 9.0813,
        longitude: 7.4673,
      },
      {
        vendor_id: "asokoro-grill",
        latitude: 9.0267,
        longitude: 7.4833,
      },
    ],
    "asokoro-grill",
    11.5,
  );

  assert.deepEqual(target, {
    center: [7.4833, 9.0267],
    zoom: SELECTED_VENDOR_CAMERA_ZOOM,
  });
});

test("selected vendor camera target preserves closer user zoom", () => {
  const target = getSelectedVendorCameraTarget(
    [
      {
        vendor_id: "wuse-rice",
        latitude: 9.0813,
        longitude: 7.4673,
      },
    ],
    "wuse-rice",
    17,
  );

  assert.equal(target?.zoom, 17);
});

test("selected vendor camera target ignores missing or invalid selected vendors", () => {
  assert.equal(
    getSelectedVendorCameraTarget(
      [{ vendor_id: "wuse-rice", latitude: 9.0813, longitude: 7.4673 }],
      "missing-vendor",
      11.5,
    ),
    null,
  );
  assert.equal(
    getSelectedVendorCameraTarget(
      [{ vendor_id: "bad-vendor", latitude: null, longitude: 7.4673 }],
      "bad-vendor",
      11.5,
    ),
    null,
  );
});

test("only direct map and card selections drive selected-vendor camera movement", () => {
  assert.equal(isSelectionCameraSource("card"), true);
  assert.equal(isSelectionCameraSource("map"), true);
  assert.equal(isSelectionCameraSource("filter"), false);
  assert.equal(isSelectionCameraSource("restore"), false);
  assert.equal(isSelectionCameraSource(null), false);
});
