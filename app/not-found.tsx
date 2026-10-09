import { Btn, Kicker } from '@/components/ui';

export default function NotFound() {
  return (
    <section className="apply" aria-labelledby="nf-title">
      <div className="container">
        <Kicker>404</Kicker>
        <h1 id="nf-title" className="h1 on-scene">
          Off the map
        </h1>
        <p className="lead on-scene" style={{ margin: '20px 0 28px' }}>
          This page drifted away with the ice. Let&apos;s get you back on the road.
        </p>
        <Btn href="/">Back to home</Btn>
      </div>
    </section>
  );
}
