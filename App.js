import { StatusBar } from "expo-status-bar";
import {
  Button,
  StyleSheet,
  Text,
  View,
  Image,
  ActivityIndicator,
  Touchable,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Modal,
  Pressable,
  TextInput,
  Alert,
} from "react-native";
import app from "./config/firebase";
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import { onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import ImageView from "react-native-image-view";
import { Icon } from "react-native-elements";
// import LikeButton from "expo-like-button";

export default function App() {
  const [image, setImage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [postDescription, setPostDescription] = useState("");
  const [postLocation, setPostLocation] = useState("");
  const [postTags, setPostTags] = useState("");
  const [data, setData] = useState([]);
  const [showFullScreen, setShowFullScreen] = useState(false);
  const [fullScreenImageData, setFullScreenImageData] = useState({});
  const [modalVisible, setModalVisible] = useState(false);

  const images = [
    {
      source: {
        uri: fullScreenImageData.image ?? "",
      },
      title: fullScreenImageData.description ?? "",
    },
  ];

  const storage = getStorage(app);
  async function fetchData() {
    const response = await fetch(
      "https://highon-task-backend.adaptable.app/posts"
    );
    const data = await response.json();
    console.log(data);
    setData(data);
  }

  useEffect(() => {
    fetchData();
  }, []);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      setModalVisible(true);
    }
  };

  function imageViewHandler(res) {
    setFullScreenImageData(res);
    setShowFullScreen(true);
  }
  async function uploadImage() {
    const blob = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = function () {
        resolve(xhr.response);
      };
      xhr.onerror = function () {
        reject(new TypeError("Network request failed"));
      };
      xhr.responseType = "blob";
      xhr.open("GET", image, true);
      xhr.send(null);
    });

    const storageRef = ref(storage, "" + new Date().getTime());
    const uploadTask = uploadBytesResumable(storageRef, blob);
    uploadTask.on(
      "state_changed",
      (snapshot) => {
        setUploading(true);
        const progress =
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
      },
      (error) => {
        console.log(error);
        setUploading(false);
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then(async (downloadURL) => {
          addPost(downloadURL);
          setData((prev) => [
            ...prev,
            {
              image: downloadURL,
              description: postDescription,
              location: postLocation,
              tags: postTags,
            },
          ]);
          setUploading(false);
          setImage("");
          setPostDescription("");
          setPostLocation("");
          setPostTags("");
        });
      }
    );

    setImage("");
  }

  async function addPost(imageURL) {
    const body = {};
    body.image = imageURL;
    body.description = postDescription;
    body.location = postLocation;
    body.tags = postTags;
    console.log(body);

    try {
      const res = await fetch("https://highon-task-backend.adaptable.app/add", {
        method: "POST",
        body: JSON.stringify(body),
        headers: {
          "Content-Type": "application/json",
        },
      });
      console.log(res);
    } catch (error) {
      console.log(error);
    }
  }

  return (
    <View style={styles.container}>
      <View
        style={{
          justifyContent: "flex-end",
          backgroundColor: "white",
          flexDirection: "row",
          marginTop: 50,
        }}
      >
        <TouchableOpacity
          style={{
            borderRadius: 4,
            borderWidth: 2,
            width: 30,
            height: 30,
            alignItems: "center",
            margin: 20,
          }}
          onPress={pickImage}
        >
          <Text style={{ fontSize: 20, fontWeight: "bold" }}>+</Text>
        </TouchableOpacity>
      </View>
      <ImageView
        images={images}
        isVisible={showFullScreen}
        onClose={() => setShowFullScreen(false)}
      />
      <ScrollView>
        <View
          style={{
            // flex: 5,
            flex: 1,
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {data.map((res) => (
            <>
              {res.image && res.image !== "test" && (
                <View style={styles.card}>
                  <Text style={styles.postText}>{res.location}</Text>
                  <TouchableOpacity onPress={() => imageViewHandler(res)}>
                    <Image
                      source={{ uri: res.image }}
                      resizeMethod="resize"
                      style={{ height: 170, width: 170, borderRadius: 10 }}
                    />
                  </TouchableOpacity>
                  <Text style={styles.postText}>{res.description}</Text>
                </View>
              )}
            </>
          ))}
        </View>
      </ScrollView>
      {uploading && <ActivityIndicator size={"small"} color="black" />}

      <View style={styles.centeredView}>
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => {
            setModalVisible(!modalVisible);
          }}
        >
          <View style={styles.centeredView}>
            <View style={styles.modalView}>
              <Text style={styles.modalText}>Description</Text>
              <TextInput
                multiline={true}
                onChangeText={(val) => setPostDescription(val)}
                placeholder="type here..."
                style={styles.inputBox}
              />
              <Text style={styles.modalText}>Location</Text>
              <TextInput
                onChangeText={(val) => setPostLocation(val)}
                placeholder="type here..."
                style={styles.input}
              />

              <Text style={styles.modalText}>Tags</Text>
              <Text>(seperate each with a ',')</Text>
              <TextInput
                onChangeText={(val) => setPostTags(val)}
                placeholder="type here..."
                style={styles.input}
              />

              <Pressable
                style={[styles.button, styles.buttonClose]}
                onPress={() => {
                  if (postTags !== "") {
                    setModalVisible(!modalVisible);
                    uploadImage();
                  } else Alert.alert("Enter at least one tag");
                }}
              >
                <Text style={styles.textStyle}>Post</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    margin: 5,
    justifyContent: "center",
  },
  card: {
    margin: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "lightgray",
    padding: 10,

    shadowOffset: { width: -2, height: 4 },
    shadowColor: "#171717",
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  postText: {
    marginLeft: 5,
    color: "gray",
  },
  inputBox: {
    height: 100,
    borderWidth: 1,
    borderRadius: 5,
    width: 200,
    marginBottom: 10,
    borderColor: "blue",
    padding: 2,
  },
  input: {
    borderWidth: 1,
    borderRadius: 5,
    width: 200,
    marginBottom: 10,
    borderColor: "blue",
    padding: 2,
  },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 22,
  },
  modalView: {
    margin: 20,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 35,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  button: {
    borderRadius: 20,
    padding: 10,
    elevation: 2,
  },
  buttonOpen: {
    backgroundColor: "#F194FF",
  },
  buttonClose: {
    backgroundColor: "#2196F3",
    marginTop: 30,
  },
  textStyle: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
  },
  modalText: {
    fontSize: 14,
    fontWeight: "bold",
    alignSelf: "flex-start",
    color: "gray",
  },
});
