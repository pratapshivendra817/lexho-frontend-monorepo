// pages/admin/UserProfile.tsx
import UserInfoCard from "../../components/user/UserInfoCard";
import UserStats from "../../components/user/UserStats";
import BookingHistoryTable from "../../components/user/BookingHistoryTable";
import ActivityLogs from "../../components/user/ActivityLogs";
import UserActions from "../../components/user/UserActions";

import { userData } from "../../data/userData";

export default function UserProfile() {
  return (
    <div className="p-6 text-white bg-[#0f172a] min-h-screen">
      
      <h1 className="text-2xl font-bold mb-6">User Profile</h1>

      {/* Top Section */}
      <div className="grid grid-cols-3 gap-5 mb-6">
        <UserInfoCard user={userData} />
        <div className="col-span-2">
          <UserStats user={userData} />
        </div>
      </div>

      {/* Actions */}
      <div className="mb-6">
        <UserActions user={userData} />
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-2 gap-5">
        <BookingHistoryTable data={userData.bookings} />
        <ActivityLogs logs={userData.activities} />
      </div>
    </div>
  );
}