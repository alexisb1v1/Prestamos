"use client";

import { useState, useEffect, useMemo } from "react";
import { createUserUseCase, updateUserUseCase } from "@/app/features/users";
import { searchPersonUseCase } from "@/app/features/people";
import { User as UserModel } from "@/app/features/users/models/user.model";
import { getAllCompaniesUseCase, Company } from "@/app/features/companies";
import { authService } from "@/lib/auth";
import { User } from "@/lib/types";
import { logger } from "@/lib/logging-service";
import {
  X,
  Fingerprint,
  User as UserIcon,
  ShieldCheck,
  Building,
  Key,
  UserCircle,
  AlertCircle,
  Info,
  Save,
  UserPlus,
  Check,
  Search,
} from "lucide-react";

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userToEdit?: UserModel | null;
}

interface CreateUserFormData {
  username: string;
  password?: string;
  profile: string;
  documentType: string;
  documentNumber: string;
  firstName: string;
  lastName: string;
  birthday?: string | null;
  status?: "ACTIVE" | "INACTIVE";
  idCompany?: string;
}

export default function CreateUserModal({
  isOpen,
  onClose,
  onSuccess,
  userToEdit,
}: CreateUserModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Initial state memoized to prevent useEffect triggers on every render
  const initialFormState: CreateUserFormData = useMemo(
    () => ({
      username: "",
      password: "",
      profile: "COBRADOR",
      documentType: "DNI",
      documentNumber: "",
      firstName: "",
      lastName: "",
      birthday: null,
    }),
    [],
  );

  const [formData, setFormData] =
    useState<CreateUserFormData>(initialFormState);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [searchingPerson, setSearchingPerson] = useState(false);

  // Reset logic when modal opens or userToEdit changes
  useEffect(() => {
    if (isOpen) {
      const user = authService.getUser();
      const timerBase = setTimeout(() => {
        setCurrentUser(user);
      }, 0);

      const fetchCompanies = async () => {
        if (user?.profile === "OWNER") {
          const result = await getAllCompaniesUseCase.execute();
          result.match(
            (data) => setCompanies(data),
            (err) => logger.error("Error fetching companies", err),
          );
        }
      };
      fetchCompanies();

      let editTimer: NodeJS.Timeout | null = null;
      let newTimer: NodeJS.Timeout | null = null;

      if (userToEdit) {
        editTimer = setTimeout(() => {
          setFormData({
            username: userToEdit.username,
            password: "",
            profile: userToEdit.profile,
            documentType: userToEdit.documentType,
            documentNumber: userToEdit.documentNumber,
            firstName: userToEdit.firstName,
            lastName: userToEdit.lastName,
            birthday: null,
            status: userToEdit.status,
            idCompany: userToEdit.idCompany,
          });
          setError("");
          setSearchingPerson(false);
        }, 0);
      } else {
        newTimer = setTimeout(() => {
          setFormData(initialFormState);
          setError("");
          setSearchingPerson(false);
        }, 0);
      }

      return () => {
        clearTimeout(timerBase);
        if (editTimer) clearTimeout(editTimer);
        if (newTimer) clearTimeout(newTimer);
      };
    }
  }, [isOpen, userToEdit, initialFormState]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Auto-search person logic
  useEffect(() => {
    if (!isOpen) return;
    if (!formData.documentNumber || formData.documentNumber.length < 8) return;

    const timer = setTimeout(async () => {
      setSearchingPerson(true);
      setError("");

      const result = await searchPersonUseCase.execute(
        formData.documentType,
        formData.documentNumber,
      );

      result.match(
        (person) => {
          setFormData((prev) => ({
            ...prev,
            firstName: person.firstName,
            lastName: person.lastName,
          }));
        },
        (err) => {
          setFormData((prev) => ({ ...prev, firstName: "", lastName: "" }));

          const isNotFound =
            err.statusCode === 404 ||
            err.code === "GEN_005" ||
            err.message?.toLowerCase().includes("not found") ||
            err.message?.toLowerCase().includes("no encontrado");

          if (isNotFound) {
            setError("");
          } else {
            logger.error("Error searching person:", err);
            setError(err.message || "Error al realizar la búsqueda.");
          }
        },
      );
      setSearchingPerson(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [formData.documentNumber, formData.documentType, isOpen]);

  // Auto-generate username logic
  useEffect(() => {
    if (!isOpen || userToEdit) return;

    const effectiveCompanyId =
      formData.idCompany || currentUser?.idCompany || "";

    if (effectiveCompanyId) {
      let newUsername = "";

      if (
        formData.profile === "ADMIN" &&
        formData.firstName &&
        formData.lastName
      ) {
        const firstLetter = formData.firstName.charAt(0).toLowerCase();
        const firstLastName = formData.lastName.split(" ")[0].toLowerCase();
        newUsername = `${effectiveCompanyId}:${firstLetter}${firstLastName}`;
      } else if (formData.profile === "COBRADOR" && formData.documentNumber) {
        newUsername = `${effectiveCompanyId}:${formData.documentNumber}`;
      }

      if (newUsername) {
        const timer = setTimeout(() => {
          setFormData((prev) => ({
            ...prev,
            username: newUsername,
          }));
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, [
    formData.idCompany,
    currentUser?.idCompany,
    formData.documentNumber,
    formData.firstName,
    formData.lastName,
    formData.profile,
    isOpen,
    userToEdit,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { status, ...creationData } = formData;
    void status; // Consume effectively to satisfy linter if needed, or just don't destructure

    const result = userToEdit
      ? await updateUserUseCase.execute(userToEdit.id, {
          firstName: formData.firstName,
          lastName: formData.lastName,
          profile: formData.profile,
          status: formData.status || userToEdit.status,
          birthday: null,
        })
      : await createUserUseCase.execute({ ...creationData, birthday: null });

    result.match(
      () => {
        onSuccess();
        onClose();
      },
      (err) => {
        logger.error("Error saving user:", err);
        setError(
          err.message ||
            (userToEdit
              ? "Error al actualizar usuario."
              : "Error al crear usuario."),
        );
      },
    );
    setLoading(false);
  };

  const isPersonFound = formData.firstName && !searchingPerson;

  if (!isOpen) return null;

  return (
    <div
      className="create-user-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="create-user-modal">
        {/* HEADER */}
        <div className="create-user-header">
          <div
            style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
          >
            {userToEdit ? (
              <UserIcon size={20} color="#3b82f6" strokeWidth={2.5} />
            ) : (
              <UserPlus size={20} color="#3b82f6" strokeWidth={2.5} />
            )}
            <h2 className="create-user-title">
              {userToEdit ? "Editar Perfil" : "Nuevo Usuario"}
            </h2>
          </div>
          <button className="create-user-close" onClick={onClose}>
            <X size={20} strokeWidth={3} />
          </button>
        </div>

        <div className="create-user-scroll-area">
          {/* ALERTS */}
          {error && (
            <div
              className="create-user-section"
              style={{ background: "#fff1f2", borderColor: "#fecaca" }}
            >
              <div
                style={{
                  display: "flex",
                  gap: "0.75rem",
                  alignItems: "center",
                }}
              >
                <AlertCircle size={20} color="#ef4444" />
                <div
                  style={{
                    fontSize: "0.85rem",
                    color: "#b91c1c",
                    fontWeight: 600,
                  }}
                >
                  {error}
                </div>
              </div>
            </div>
          )}

          {!error &&
            !formData.firstName &&
            formData.documentNumber.length >= 8 &&
            !searchingPerson && (
              <div
                className="create-user-section"
                style={{ background: "#eff6ff", borderColor: "#dbeafe" }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: "0.75rem",
                    alignItems: "center",
                  }}
                >
                  <Info size={20} color="#3b82f6" />
                  <div
                    style={{
                      fontSize: "0.85rem",
                      color: "#1e40af",
                      fontWeight: 600,
                    }}
                  >
                    Persona no encontrada. Ingrese los datos manualmente.
                  </div>
                </div>
              </div>
            )}

          <form
            id="user-form"
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
          >
            {/* SECTION: IDENTITY */}
            <div className="create-user-section">
              <h3 className="create-user-section-title">
                <Fingerprint size={14} /> Identidad del Usuario
              </h3>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "80px 1fr",
                  gap: "0.75rem",
                }}
              >
                <div className="create-user-group">
                  <label className="create-user-label">Tipo</label>
                  <select
                    className="create-user-input"
                    name="documentType"
                    value={formData.documentType}
                    onChange={handleChange}
                  >
                    <option value="DNI">DNI</option>
                    <option value="CE">CE</option>
                    <option value="PASAPORTE">PAS</option>
                  </select>
                </div>
                <div className="create-user-group">
                  <label className="create-user-label">Número de Documento</label>
                  <div className="create-user-input-wrapper">
                    <input
                      type="text"
                      className="create-user-input create-user-input-with-icon"
                      name="documentNumber"
                      value={formData.documentNumber}
                      onChange={handleChange}
                      required
                      placeholder="Ej. 70654321"
                      inputMode="numeric"
                      autoComplete="off"
                    />
                    {searchingPerson ? (
                      <div
                        className="create-user-input-icon"
                        style={{ animation: "spin 1s linear infinite" }}
                      >
                        <Search size={16} />
                      </div>
                    ) : isPersonFound ? (
                      <Check
                        className="create-user-input-icon"
                        size={16}
                        color="#10b981"
                      />
                    ) : (
                      <Search className="create-user-input-icon" size={16} />
                    )}
                  </div>
                </div>
              </div>

              <div className="create-user-group">
                <label className="create-user-label">Nombres Completos</label>
                <div className="create-user-input-wrapper">
                  <input
                    type="text"
                    className="create-user-input create-user-input-with-icon"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                    placeholder="Ingrese nombres"
                    autoComplete="off"
                  />
                  <UserIcon className="create-user-input-icon" size={16} />
                </div>
              </div>

              <div className="create-user-group">
                <label className="create-user-label">Apellidos</label>
                <div className="create-user-input-wrapper">
                  <input
                    type="text"
                    className="create-user-input create-user-input-with-icon"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                    placeholder="Ingrese apellidos"
                    autoComplete="off"
                  />
                  <UserIcon className="create-user-input-icon" size={16} />
                </div>
              </div>
            </div>

            {/* SECTION: PROFILE & ROLE */}
            <div className="create-user-section">
              <h3 className="create-user-section-title">
                <ShieldCheck size={14} /> Perfil y Accesos
              </h3>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: userToEdit ? "1fr 1fr" : "1fr",
                  gap: "1rem",
                }}
              >
                <div className="create-user-group">
                  <label className="create-user-label">Rol en el Sistema</label>
                  <select
                    className="create-user-input"
                    name="profile"
                    value={formData.profile}
                    onChange={handleChange}
                    disabled={!!userToEdit}
                  >
                    <option value="COBRADOR">Cobrador / Gestor</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
                </div>

                {userToEdit && (
                  <div className="create-user-group">
                    <label className="create-user-label">Estado de la Cuenta</label>
                    <select
                      className="create-user-input"
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      style={{
                        color:
                          formData.status === "ACTIVE" ? "#10b981" : "#ef4444",
                      }}
                    >
                      <option value="ACTIVE">● ACTIVO</option>
                      <option value="INACTIVE">● INACTIVO</option>
                    </select>
                  </div>
                )}
              </div>

              {currentUser?.profile === "OWNER" && (
                <div className="create-user-group">
                  <label className="create-user-label">Asignar a Empresa</label>
                  <div className="create-user-input-wrapper">
                    <select
                      className="create-user-input create-user-input-with-icon"
                      name="idCompany"
                      value={formData.idCompany || ""}
                      onChange={handleChange}
                      disabled={!!userToEdit}
                    >
                      <option value="">Seleccione empresa...</option>
                      {companies.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.companyName}
                        </option>
                      ))}
                    </select>
                    <Building className="create-user-input-icon" size={16} />
                  </div>
                </div>
              )}
            </div>

            {/* SECTION: CREDENTIALS (ONLY FOR NEW) */}
            {!userToEdit && (
              <div
                className="create-user-section"
                style={{ borderStyle: "dashed", background: "#f8fafc" }}
              >
                <h3 className="create-user-section-title">
                  <Key size={14} /> Credenciales de Acceso
                </h3>

                <div className="create-user-group">
                  <label className="create-user-label">
                    ID de Usuario (Autogenerado)
                  </label>
                  <div className="create-user-input-wrapper">
                    <input
                      type="text"
                      className="create-user-input create-user-input-with-icon disabledInput"
                      name="username"
                      value={formData.username}
                      readOnly
                      disabled
                      title="Se genera automáticamente basado en la empresa y el DNI"
                    />
                    <UserCircle
                      className="create-user-input-icon"
                      size={16}
                      color="#64748b"
                    />
                  </div>
                </div>

                <div className="create-user-group">
                  <label className="create-user-label">Contraseña</label>
                  <div className="create-user-input-wrapper">
                    <input
                      type="password"
                      className="create-user-input create-user-input-with-icon"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      placeholder="Mínimo 6 caracteres"
                      minLength={6}
                      autoComplete="new-password"
                    />
                    <Key className="create-user-input-icon" size={16} />
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* FOOTER */}
        <div className="create-user-footer">
          <button
            className="create-user-cancel-btn"
            onClick={onClose}
            disabled={loading}
          >
            CANCELAR
          </button>
          <button
            type="submit"
            form="user-form"
            className="create-user-action-btn"
            disabled={
              loading ||
              (userToEdit ? false : !formData.username || !formData.password)
            }
          >
            {loading ? (
              "GUARDANDO..."
            ) : (
              <>
                {userToEdit ? (
                  <>
                    <span>ACTUALIZAR PERFIL</span> <Save size={18} />
                  </>
                ) : (
                  <>
                    <span>CREAR USUARIO</span> <UserPlus size={18} />
                  </>
                )}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
