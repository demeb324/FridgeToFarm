"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { Driver, DriverRouteAssignment, DriverRouteStatus } from "@/lib/types";

const statusOptions: DriverRouteStatus[] = ["Waiting", "Started", "In Progress", "Completed"];

export function DriverDashboard({
  drivers,
  assignments,
}: {
  drivers: Driver[];
  assignments: DriverRouteAssignment[];
}) {
  const selectedDriverId = drivers[0]?.id ?? "";
  const [routeStates, setRouteStates] = useState(assignments);
  const [uploadedImages, setUploadedImages] = useState<Record<string, string>>({});
  const [submittedChecks, setSubmittedChecks] = useState<Record<string, boolean>>({});

  const selectedDriver = drivers.find((driver) => driver.id === selectedDriverId) ?? drivers[0];
  const driverAssignments = useMemo(
    () => routeStates.filter((assignment) => assignment.driverId === selectedDriverId),
    [routeStates, selectedDriverId],
  );

  useEffect(() => {
    return () => {
      Object.values(uploadedImages).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [uploadedImages]);

  const updateStatus = (assignmentId: string, status: DriverRouteStatus) => {
    setRouteStates((current) =>
      current.map((assignment) => (assignment.id === assignmentId ? { ...assignment, status } : assignment)),
    );
  };

  const uploadImage = (assignmentId: string, file: File | undefined) => {
    if (!file) {
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setUploadedImages((current) => ({
      ...current,
      [assignmentId]: objectUrl,
    }));
    setSubmittedChecks((current) => ({
      ...current,
      [assignmentId]: false,
    }));
  };

  const submitQualityCheck = (assignmentId: string) => {
    setSubmittedChecks((current) => ({
      ...current,
      [assignmentId]: true,
    }));
  };

  return (
    <div className="space-y-6">
      <section className="space-y-6">
        <div className="rounded-[2rem] border border-emerald-100 bg-[linear-gradient(135deg,#f6fbf5_0%,#fffaf1_100%)] p-6 shadow-[0_20px_40px_-35px_rgba(41,37,36,0.35)]">
          <div className="flex items-center gap-4">
            <Image
              src={selectedDriver.avatarUrl}
              alt={`${selectedDriver.firstName} ${selectedDriver.lastName}`}
              width={60}
              height={60}
              className="h-15 w-15 rounded-full object-cover"
            />
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">Current driver</p>
              <h2 className="mt-1 text-2xl font-semibold text-stone-950">
                {selectedDriver.firstName} {selectedDriver.lastName}
              </h2>
              <p className="mt-1 text-sm text-stone-600">
                {selectedDriver.vehicle} · {selectedDriver.phone} · {selectedDriver.zone}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6">
          {driverAssignments.map((assignment) => (
            <article
              key={assignment.id}
              className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-[0_20px_40px_-35px_rgba(41,37,36,0.3)]"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">
                    {assignment.routeTitle}
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold text-stone-950">{assignment.pickupSource}</h3>
                  <p className="mt-2 text-sm leading-7 text-stone-600">
                    Destination: {assignment.destination}
                  </p>
                </div>
                <div className="rounded-full bg-stone-100 px-4 py-2 text-sm font-semibold text-stone-700">
                  {assignment.pickupWindow}
                </div>
              </div>

              <div className="mt-6 rounded-[1.75rem] border border-stone-200 bg-stone-50 p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">Route timeline</p>
                <div className="mt-5 space-y-4">
                  {[
                    {
                      label: "Pickup source",
                      value: assignment.pickupSource,
                      detail: assignment.pickupWindow,
                    },
                    {
                      label: "Material loaded",
                      value: assignment.material,
                      detail: assignment.notes,
                    },
                    {
                      label: "Drop-off destination",
                      value: assignment.destination,
                      detail: `Current status: ${assignment.status}`,
                    },
                  ].map((item, index, items) => (
                    <div key={item.label} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-700 text-sm font-semibold text-white">
                          {index + 1}
                        </div>
                        {index < items.length - 1 ? (
                          <div className="mt-2 h-full min-h-8 w-px bg-emerald-200" />
                        ) : null}
                      </div>
                      <div className="pb-2">
                        <p className="text-sm font-semibold text-stone-950">{item.label}</p>
                        <p className="mt-1 text-base font-medium text-stone-800">{item.value}</p>
                        <p className="mt-1 text-sm leading-7 text-stone-600">{item.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
                <div className="rounded-[1.5rem] border border-stone-200 p-4">
                  <label className="text-sm font-semibold text-stone-950">
                    Route status
                    <select
                      value={assignment.status}
                      onChange={(event) => updateStatus(assignment.id, event.target.value as DriverRouteStatus)}
                      className="mt-2 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-400"
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="rounded-[1.5rem] border border-stone-200 p-4">
                  <p className="text-sm font-semibold text-stone-950">Quality check</p>
                  <p className="mt-2 text-sm leading-7 text-stone-600">
                    Upload a route image after pickup or delivery, then submit the quality check for dispatch review.
                  </p>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <label className="inline-flex cursor-pointer items-center justify-center rounded-2xl border border-stone-300 px-4 py-3 text-sm font-semibold text-stone-700 hover:border-stone-400">
                      Upload image
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => uploadImage(assignment.id, event.target.files?.[0])}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => submitQualityCheck(assignment.id)}
                      className="rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
                    >
                      Submit quality check
                    </button>
                  </div>

                  {uploadedImages[assignment.id] ? (
                    <div className="mt-4 rounded-[1.5rem] bg-stone-50 p-3">
                      <Image
                        src={uploadedImages[assignment.id]}
                        alt={`${assignment.routeTitle} upload preview`}
                        width={640}
                        height={360}
                        unoptimized
                        className="h-48 w-full rounded-[1.25rem] object-cover"
                      />
                    </div>
                  ) : null}

                  {submittedChecks[assignment.id] ? (
                    <div className="mt-4 rounded-[1.25rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
                      Quality check submitted for this route.
                    </div>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
