create index if not exists vendors_price_band_idx
  on public.vendors (price_band)
  where price_band is not null;

create index if not exists user_events_vendor_usage_idx
  on public.user_events (vendor_id, event_type)
  where vendor_id is not null
    and event_type in (
      'vendor_selected',
      'vendor_detail_opened',
      'directions_clicked',
      'call_clicked'
    );
