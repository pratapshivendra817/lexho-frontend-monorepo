import React from "react";

interface Props {
  title: string;
  services: number;
  bookings: number;
  color: string;
  bg: string;
  icon: React.ReactNode;
}

const CategoryCard: React.FC<Props> = ({
  title,
  services,
  bookings,
  color,
  bg,
  icon,
}) => {
  return (
    <div
      className={`border ${color} rounded-2xl p-5 bg-[#0f172a] shadow-lg hover:scale-105 hover:shadow-xl transition-all duration-300`}
    >
      <div className="flex flex-col items-center text-center gap-3">
        
        {/* Icon */}
        <div className={`w-14 h-14 flex items-center justify-center rounded-full ${bg}`}>
          {icon}
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold">{title}</h3>

        {/* Services */}
        <p className="text-sm text-gray-400">{services} Services</p>

        {/* Bookings */}
        <p className="text-sm font-semibold text-white">
          {bookings} Bookings
        </p>

        {/* Button */}
        <button
          className={`mt-3 px-4 py-2 text-sm rounded-xl bg-gradient-to-r ${bg} text-black font-medium hover:opacity-90`}
        >
          Manage
        </button>
      </div>
    </div>
  );
};

export default CategoryCard;