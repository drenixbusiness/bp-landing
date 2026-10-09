'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Camera, ChevronLeft, ChevronRight, Gauge, MapPin, Phone, X } from 'lucide-react';
import { COMPANY } from '@/lib/content';

export interface Truck {
  id: string;
  model: string;
  year: number;
  location: string;
  mileage: number;
  engine: string;
  transmission: string;
  photos: string[];
}

const fmtMiles = (n: number) => `${n.toLocaleString('en-US')} mi`;

export default function Catalog({ trucks }: { trucks: Truck[] }) {
  const [model, setModel] = useState('');
  const [loc, setLoc] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [photo, setPhoto] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);

  const models = useMemo(() => [...new Set(trucks.map((t) => t.model))].sort(), [trucks]);
  const locations = useMemo(() => [...new Set(trucks.map((t) => t.location))].sort(), [trucks]);
  const list = trucks.filter((t) => (!model || t.model === model) && (!loc || t.location === loc));
  const current = trucks.find((t) => t.id === openId) || null;

  const open = (id: string) => {
    lastFocus.current = document.activeElement as HTMLElement;
    setPhoto(0);
    setOpenId(id);
  };
  const close = useCallback(() => setOpenId(null), []);

  // native listener: React does not reliably surface the dialog 'close' event (Esc)
  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    const onCancel = (e: Event) => {
      e.preventDefault();
      close();
    };
    d.addEventListener('close', close);
    d.addEventListener('cancel', onCancel);
    return () => {
      d.removeEventListener('close', close);
      d.removeEventListener('cancel', onCancel);
    };
  }, [close]);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (current && !d.open) {
      d.showModal();
      document.documentElement.classList.add('no-scroll');
    }
    if (!current && d.open) d.close();
    if (!current) {
      document.documentElement.classList.remove('no-scroll');
      lastFocus.current?.focus?.();
    }
  }, [current]);

  const step = useCallback(
    (dir: number) => {
      if (!current) return;
      setPhoto((p) => (p + dir + current.photos.length) % current.photos.length);
    },
    [current],
  );

  useEffect(() => {
    if (!current) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, step, close]);

  // swipe on touch devices
  const touchX = useRef<number | null>(null);

  return (
    <>
      <div className="filter-bar glass card-dark" data-reveal>
        <label className="select">
          <span className="sr-only">Model</span>
          <select value={model} onChange={(e) => setModel(e.target.value)}>
            <option value="">All Models</option>
            {models.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
        <label className="select">
          <span className="sr-only">Location</span>
          <select value={loc} onChange={(e) => setLoc(e.target.value)}>
            <option value="">All Locations</option>
            {locations.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
        <p className="total mono" aria-live="polite">
          Total trucks: <strong>{list.length}</strong>
        </p>
      </div>

      {list.length ? (
        <ul className="truck-grid">
          {list.map((t, i) => (
            <li key={t.id} data-reveal style={{ ['--d' as string]: `${(i % 3) * 0.07}s` }}>
              <button type="button" className="truck-card glass card-dark" onClick={() => open(t.id)} aria-haspopup="dialog">
                <span className="truck-photo">
                  <Image src={t.photos[0]} alt="" width={640} height={640} priority={i < 2} sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 420px" />
                  <span className="photo-count mono">
                    <Camera size={13} aria-hidden="true" /> {t.photos.length}
                  </span>
                </span>
                <span className="truck-body">
                  <span className="truck-model">{t.model}</span>
                  <span className="truck-meta mono">
                    <span>{t.year}</span>
                    <span>
                      <MapPin size={13} aria-hidden="true" /> {t.location}
                    </span>
                    <span>
                      <Gauge size={13} aria-hidden="true" /> {fmtMiles(t.mileage)}
                    </span>
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty glass card-dark" role="status">
          <p className="h3">No trucks match these filters.</p>
          <div className="btn-row center">
            <button type="button" className="btn btn-primary" onClick={() => { setModel(''); setLoc(''); }}>
              <span>Clear filters</span>
            </button>
            <a href={COMPANY.phoneHref} className="btn btn-ghost">
              <Phone size={16} aria-hidden="true" />
              <span className="mono">{COMPANY.phone}</span>
            </a>
          </div>
        </div>
      )}

      <dialog ref={dialogRef} className="truck-modal" aria-labelledby="truck-modal-title" onClick={(e) => e.target === dialogRef.current && close()}>
        {current && (
          <div className="truck-modal-inner glass card-dark">
            <button type="button" className="icon-btn modal-close" onClick={close} aria-label="Close">
              <X size={20} />
            </button>
            <div
              className="gallery"
              onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
              onTouchEnd={(e) => {
                if (touchX.current === null) return;
                const dx = e.changedTouches[0].clientX - touchX.current;
                if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1);
                touchX.current = null;
              }}
            >
              <div className="gallery-main">
                <Image key={current.photos[photo]} src={current.photos[photo]} alt={`${current.model} — photo ${photo + 1} of ${current.photos.length}`} fill priority sizes="(max-width: 900px) 100vw, 720px" />
                {current.photos.length > 1 && (
                  <>
                    <button type="button" className="icon-btn gal-prev" onClick={() => step(-1)} aria-label="Previous photo">
                      <ChevronLeft size={22} />
                    </button>
                    <button type="button" className="icon-btn gal-next" onClick={() => step(1)} aria-label="Next photo">
                      <ChevronRight size={22} />
                    </button>
                  </>
                )}
                <span className="photo-count mono">
                  {photo + 1} / {current.photos.length}
                </span>
              </div>
              <div className="gallery-thumbs">
                {current.photos.map((p, i) => (
                  <button type="button" key={p + i} className={i === photo ? 'is-on' : ''} onClick={() => setPhoto(i)} aria-label={`Show photo ${i + 1}`} aria-pressed={i === photo}>
                    <Image src={p} alt="" width={96} height={96} />
                  </button>
                ))}
              </div>
            </div>
            <div className="truck-specs">
              <p className="kicker">Truck details</p>
              <h2 id="truck-modal-title" className="h3">
                {current.model}
              </h2>
              <dl>
                <div><dt>Year</dt><dd>{current.year}</dd></div>
                <div><dt>Mileage</dt><dd>{fmtMiles(current.mileage)}</dd></div>
                <div><dt>Engine</dt><dd>{current.engine}</dd></div>
                <div><dt>Transmission</dt><dd>{current.transmission}</dd></div>
                <div><dt>Location</dt><dd>{current.location}</dd></div>
              </dl>
              <div className="btn-col">
                <Link href={`/apply-now?truck=${encodeURIComponent(current.id)}`} className="btn btn-primary btn-block" onClick={close}>
                  <span>Apply for this truck</span>
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>
                <a href={COMPANY.phoneHref} className="btn btn-ghost btn-block">
                  <Phone size={16} aria-hidden="true" />
                  <span className="mono">{COMPANY.phone}</span>
                </a>
              </div>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
