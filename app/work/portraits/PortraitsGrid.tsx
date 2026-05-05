import Image from "next/image";

type PortraitImage = {
  id: number;
  src: string;
  alt: string;
};

const images: PortraitImage[] = [
  { id: 1, src: "/portraits/hero.jpg", alt: "Portrait in soft natural light" },
  { id: 2, src: "/portraits/candid.jpg", alt: "Candid portrait with natural expression" },
  { id: 3, src: "/portraits/natural.jpg", alt: "Portrait in warm natural light outdoors" },
  { id: 4, src: "/portraits/male.jpg", alt: "Portrait in soft directional light" },
  { id: 6, src: "/portraits/connection.jpg", alt: "Portrait capturing a quiet human moment" },
  { id: 5, src: "/portraits/moody.jpg", alt: "Portrait with subtle shadow and contrast" },
  { id: 7, src: "/portraits/environment.jpg", alt: "Environmental portrait outdoors" },
];

function ImageCard({
  image,
  className = "",
}: {
  image: PortraitImage;
  className?: string;
}) {
  return (
    <figure
      className={`group relative aspect-[4/5] overflow-hidden rounded-2xl bg-neutral-900 ${className}`}
    >
      <Image
        src={image.src}
        alt={image.alt}
        fill
        sizes="(min-width: 768px) 50vw, 92vw"
        className="object-cover transition duration-700 ease-out md:group-hover:scale-[1.01]"
      />
    </figure>
  );
}

export default function PortraitsGrid() {
  return (
    <div className="flex flex-col gap-8 md:gap-10">

      {/* Row 1: Hero + candid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
        <ImageCard image={images[0]} className="md:col-span-2" />
        <ImageCard image={images[1]} />
      </div>

      {/* Row 2: warm light + grounded portrait */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
        <ImageCard
          image={images[2]}
          className="md:max-w-[92%]"
        />

        <ImageCard
          image={images[3]}
          className="md:mt-10"
        />
      </div>

      {/* Row 3: connection + moody contrast */}
<div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
  <ImageCard
    image={images[4]}
    className="md:-mt-6"
  />

  <ImageCard image={images[5]} />
</div>

      {/* Row 4: Closing image */}
      <div className="flex justify-center pt-2 md:pt-4">
        <div className="w-full md:w-[48%]">
          <ImageCard image={images[6]} />
        </div>
      </div>

    </div>
  );
}