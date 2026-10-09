import type { Metadata } from 'next';
import Catalog, { type Truck } from '@/components/Catalog';
import { Kicker } from '@/components/ui';
import trucks from '@/data/trucks.json';

export const metadata: Metadata = {
  title: 'Truck Catalog',
  description: 'Available trucks with photo gallery and truck details.',
};

export default function CatalogPage() {
  return (
    <>
      <section className="page-hero catalog-hero" aria-labelledby="cat-h1">
        <div className="container">
          <Kicker>Inventory</Kicker>
          <h1 id="cat-h1" className="h1" data-reveal>
            Truck Catalog
          </h1>
          <p className="lead" data-reveal style={{ ['--d' as string]: '.08s' }}>
            Available trucks with photo gallery and truck details.
          </p>
        </div>
      </section>
      <section className="section catalog-sec">
        <div className="container">
          <Catalog trucks={trucks as Truck[]} />
        </div>
      </section>
    </>
  );
}
