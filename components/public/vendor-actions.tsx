import {
  getDirectionsUrl,
  getPhoneHref,
} from "../../lib/vendors/public-api-client.ts";

type VendorActionsProps = {
  latitude: number;
  longitude: number;
  phoneNumber: string | null;
};

export function VendorActions({
  latitude,
  longitude,
  phoneNumber,
}: VendorActionsProps) {
  const phoneHref = getPhoneHref(phoneNumber);

  return (
    <div className="vendor-actions">
      {phoneHref ? (
        <a className="button-primary compact-button" href={phoneHref}>
          Call
        </a>
      ) : (
        <span className="button-disabled">No phone</span>
      )}
      <a
        className="button-secondary compact-button"
        href={getDirectionsUrl(latitude, longitude)}
        rel="noreferrer"
        target="_blank"
      >
        Directions
      </a>
    </div>
  );
}
