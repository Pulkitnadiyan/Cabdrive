import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import BankAccountModal from '../Admin/BankAccountModal';
import { 
  User, Car, Mail, Edit, Save, ArrowLeft, Shield, Phone, CreditCard, Star, Image as ImageIcon, ShieldCheck
} from 'lucide-react';
import api from '../../apiClient';

const DriverProfile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [driverData, setDriverData] = useState(null);
  const [isApplication, setIsApplication] = useState(false);
  const [profilePhotoFile, setProfilePhotoFile] = useState(null);
  const [carPhotoFile, setCarPhotoFile] = useState(null);
  const [licensePhotoFile, setLicensePhotoFile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showBankModal, setShowBankModal] = useState(false);

  useEffect(() => {
    const fetchDriverDetails = async () => {
      if (!user?.id) {
        setError('User not authenticated.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const response = await api.get(`/api/drivers/profile/${user.id}`);
        setDriverData(response.data);
        if (!response.data?.profileCompleted) {
          setIsEditing(true);
        }
      } catch (err) {
        if (err.response && err.response.status === 404) {
          setIsApplication(true);
          setIsEditing(true);
          setDriverData({
            name: user.username,
            email: user.email,
            phoneNumber: '',
            aadharNumber: '',
            vehicleType: '',
            vehiclePlate: '',
            upiId: '',
          });
        } else {
          console.error('Failed to fetch driver profile:', err);
          setError('Failed to load profile. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDriverDetails();
  }, [user]);

 const handleConnectBankAccount = async (bankDetails) => {
    try {
        await api.post('/api/payments/create-bank-account', {
            driverId: user.id,
            bankDetails,
        });
        
        const response = await api.get(`/api/drivers/profile/${user.id}`);
        setDriverData(response.data);
        
        setShowBankModal(false);
        alert('Bank account connected successfully!');
    } catch (err) {
        console.error('Failed to connect bank account:', err);
        throw err;
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setDriverData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    if (files && files[0]) {
      if (name === 'profilePhoto') setProfilePhotoFile(files[0]);
      else if (name === 'carPhoto') setCarPhotoFile(files[0]);
      else if (name === 'drivingLicensePhoto') setLicensePhotoFile(files[0]);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('name', driverData.name || '');
    formData.append('email', driverData.email || '');
    formData.append('vehicleType', driverData.vehicleType || '');
    formData.append('vehiclePlate', driverData.vehiclePlate || '');
    formData.append('phoneNumber', driverData.phoneNumber || '');
    formData.append('aadharNumber', driverData.aadharNumber || '');
    formData.append('upiId', driverData.upiId || '');
    
    if (profilePhotoFile) formData.append('profilePhoto', profilePhotoFile);
    if (carPhotoFile) formData.append('carPhoto', carPhotoFile);
    if (licensePhotoFile) formData.append('drivingLicensePhoto', licensePhotoFile);

    try {
      if (!user?.id) throw new Error('User not authenticated.');
      await api.put(
        `/api/drivers/profile/${user.id}`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' }}
      );
      
      alert('Your details have been submitted and are pending review by an administrator.');
      navigate('/dashboard');
      
    } catch (err) {
      console.error('Failed to save driver profile:', err);
      setError('Failed to save changes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const InfoItem = ({ icon, label, value }) => (
      <div className="flex items-center space-x-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-700">
        <div className="p-3 rounded-full bg-gray-100 dark:bg-gray-600">
            {React.cloneElement(icon, { className: "w-6 h-6 text-gray-500 dark:text-gray-400" })}
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="font-semibold text-gray-900 dark:text-white">
              {value || 'Not specified'}
          </p>
        </div>
      </div>
  );

  const ImageDisplay = ({ label, src }) => (
    <div>
      <p className="mb-2 font-semibold text-gray-600 dark:text-gray-300">{label}</p>
      {src ? (
        <img
          src={src}
          alt={label}
          className="w-full h-40 object-cover rounded-lg border dark:border-gray-600 shadow"
        />
      ) : (
        <div className="w-full h-40 border border-dashed rounded-lg flex items-center justify-center text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700">
          No image provided
        </div>
      )}
    </div>
  );

  const FormInput = ({ label, name, ...props }) => (
    <div>
      <label htmlFor={name} className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">{label}</label>
      <input
        id={name}
        name={name}
        className="w-full border rounded-md shadow-sm p-2 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        {...props}
      />
    </div>
  );

  const FormFileInput = ({ label, name, onChange, currentImage, newFile }) => {
    const previewURL = newFile ? URL.createObjectURL(newFile) : currentImage;

    return (
        <div className="flex flex-col items-center space-y-2">
            <div className="w-24 h-24 rounded-lg border-2 border-dashed flex items-center justify-center bg-gray-50 dark:bg-gray-700 overflow-hidden">
                {previewURL ? (
                    <img src={previewURL} alt={label} className="w-full h-full object-cover" />
                ) : (
                    <ImageIcon className="h-8 w-8 text-gray-400" />
                )}
            </div>
            <label htmlFor={name} className="cursor-pointer text-sm text-center bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium py-2 px-4 rounded-md hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors">
                Choose File
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400">{newFile ? newFile.name : "No file chosen"}</p>
            <input
                id={name}
                type="file"
                name={name}
                accept="image/*"
                onChange={onChange}
                className="hidden"
            />
        </div>
    );
  };

  const renderProfileView = () => (
    <div className="space-y-8 p-6 rounded-xl shadow-lg bg-white dark:bg-gray-800">
        <div className="flex flex-col md:flex-row md:items-center md:space-x-6">
            <img
            src={driverData.profilePhoto || 'https://via.placeholder.com/150'}
            alt="Profile"
            className="w-32 h-32 rounded-full border-4 shadow-lg object-cover border-white dark:border-gray-700"
            />
            <div className="mt-4 md:mt-0 text-center md:text-left">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{driverData.name || 'Driver Name'}</h1>
            <p className="text-gray-600 dark:text-gray-300">{driverData.email || 'driver@example.com'}</p>
            <div className="flex items-center justify-center md:justify-start mt-2">
                <Star className="h-5 w-5 text-yellow-400 fill-current mr-1" />
                <span className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                    {typeof driverData.rating === 'number' ? driverData.rating.toFixed(1) : 'N/A'}
                </span>
            </div>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InfoItem icon={<Phone />} label="Phone Number" value={driverData.phoneNumber} />
            <InfoItem icon={<Shield />} label="Aadhar Number" value={
            driverData.aadharNumber ? `**** **** ${driverData.aadharNumber.slice(-4)}` : 'Not specified'
            } />
            <InfoItem icon={<Car />} label="Vehicle" value={
            driverData.vehicleType && driverData.vehiclePlate
                ? `${driverData.vehicleType} (${driverData.vehiclePlate})`
                : 'Not specified'
            } />
            <InfoItem icon={<CreditCard />} label="UPI ID" value={driverData.upiId || 'Not specified'} />
        </div>

        <div className="mt-8 pt-6 border-t dark:border-gray-700">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Documents</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ImageDisplay label="Car Photo" src={driverData.carPhoto} />
                <ImageDisplay label="Driving License" src={driverData.drivingLicensePhoto} />
            </div>
        </div>

        <div className="mt-8 pt-6 border-t dark:border-gray-700">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Payout Details</h2>
            {driverData.bankDetails && driverData.bankDetails.accountNumber ? (
                <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-300 flex items-center">
                    <ShieldCheck className="h-5 w-5 mr-3" />
                    <span>Bank Account Connected</span>
                </div>
            ) : (
                <button
                    onClick={() => setShowBankModal(true)}
                    className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 font-semibold transition"
                >
                    Connect Bank Account to Receive Payouts
                </button>
            )}
        </div>

        <button
            onClick={() => setIsEditing(true)}
            className="mt-8 w-full py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold transition flex justify-center items-center space-x-2"
        >
            <Edit size={20} />
            <span>Edit Profile</span>
        </button>

        {showBankModal && (
            <BankAccountModal 
                username={driverData.name}
                onSubmit={handleConnectBankAccount}
                onClose={() => setShowBankModal(false)}
            />
        )}
    </div>
  );
  const renderEditForm = () => (
    <form className="space-y-6 p-6 rounded-xl shadow-lg bg-white dark:bg-gray-800" onSubmit={handleSave}>
      {isApplication && (
        <div className="mb-4 p-4 rounded-md border text-center bg-blue-50 dark:bg-blue-900/50 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300">
          Apply to become a driver by filling out the form below. Your application will be reviewed by an administrator.
        </div>
      )}

      {driverData.rejectionReason && (
        <div className="mb-4 p-4 rounded-md border bg-yellow-100 dark:bg-yellow-900/50 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-300">
            <h4 className="font-bold">Your application needs attention:</h4>
            <p className="text-sm mt-1">{driverData.rejectionReason}</p>
            <p className="text-xs mt-2">Please correct the issues and save your profile to resubmit.</p>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormInput label="Full Name" name="name" type="text" value={driverData.name || ''} onChange={handleInputChange} required />
        <FormInput label="Email" name="email" type="email" value={driverData.email || ''} onChange={handleInputChange} required />
        <FormInput label="Phone Number" name="phoneNumber" type="tel" value={driverData.phoneNumber || ''} onChange={handleInputChange} />
        <FormInput label="Aadhar Number" name="aadharNumber" type="text" inputMode="numeric" pattern="\d{12}" placeholder="12 digit Aadhar Number" maxLength={12} value={driverData.aadharNumber || ''} onChange={handleInputChange} />
 <div>
            <label htmlFor="vehicleType" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Vehicle Type</label>
            <select
                id="vehicleType"
                name="vehicleType"
                value={driverData.vehicleType || ''}
                onChange={handleInputChange}
                className="w-full border rounded-md shadow-sm p-2 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
            >
                <option value="" disabled>Select a vehicle type</option>
                <option value="Sedan">Sedan</option>
                <option value="SUV">SUV</option>
                <option value="Hatchback">Hatchback</option>
                <option value="Premium">Premium</option>
                <option value="Bike">Bike</option>
            </select>
        </div>

        <FormInput label="Vehicle Plate Number" name="vehiclePlate" type="text" value={driverData.vehiclePlate || ''} onChange={handleInputChange} />
        <FormInput label="UPI ID" name="upiId" type="text" placeholder="e.g., driver@upi" value={driverData.upiId || ''} onChange={handleInputChange} />
      </div>
      
      <div className="pt-4 border-t dark:border-gray-700">
        <h3 className="text-lg font-medium text-center text-gray-800 dark:text-white mb-4">Upload Documents</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <FormFileInput label="Profile Photo" name="profilePhoto" onChange={handleFileChange} currentImage={driverData.profilePhoto} newFile={profilePhotoFile} />
            <FormFileInput label="Car Photo" name="carPhoto" onChange={handleFileChange} currentImage={driverData.carPhoto} newFile={carPhotoFile} />
            <FormFileInput label="Driving License" name="drivingLicensePhoto" onChange={handleFileChange} currentImage={driverData.drivingLicensePhoto} newFile={licensePhotoFile} />
        </div>
      </div>

      <div className="flex space-x-4 mt-6">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold transition disabled:opacity-50"
        >
          <Save className="inline-block mr-2" size={18} />
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
        {!isApplication && (
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="flex-1 py-3 border rounded-md font-semibold border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
        )}
      </div>

      {error && <p className="mt-4 text-red-600 text-center">{error}</p>}
    </form>
  );

  if (loading || !driverData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-700 dark:text-gray-300">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="shadow-sm border-b bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button
              onClick={() => navigate(-1)}
              className="mr-4 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label="Back"
            >
              <ArrowLeft size={20} className="text-gray-600 dark:text-gray-300" />
            </button>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              {isApplication ? 'Driver Application' : 'Driver Profile'}
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 md:p-10">
        {error ? (
          <div className="text-center py-10 text-red-600">{error}</div>
        ) : (
          isEditing ? renderEditForm() : renderProfileView()
        )}
      </main>
    </div>
  );
};

export default DriverProfile;
